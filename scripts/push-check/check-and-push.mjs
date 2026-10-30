// GitHub Actionsから5分おきに実行される。Firestoreに保存された各自の予定を見て、
// 「何分前」のしきい値を過ぎたものをWeb Pushで送る。
import admin from "firebase-admin";
import webpush from "web-push";

const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

function targetMs(date, time) {
  const t = new Date(date + "T" + time + ":00");
  return Number.isNaN(t.getTime()) ? null : t.getTime();
}

async function main() {
  const snap = await db.collection("users").get();
  const now = Date.now();

  console.log(`users: ${snap.size}`);
  for (const doc of snap.docs) {
    const data = doc.data();
    const notif = data.notif || {};
    const subs = Array.isArray(data.subs) ? data.subs : [];
    const items = Array.isArray(data.sched) ? data.sched : [];
    console.log(`- ${doc.id}: enabled=${!!notif.enabled} minutes=${notif.minutes} subs=${subs.length} sched=${items.length}`);
    if (!notif.enabled) continue;
    if (!subs.length) continue;

    const minutes = Number(notif.minutes) || 10;
    const notified = { ...(data.notified || {}) };
    const validIds = new Set(items.map((it) => it.id));
    let changed = false;

    for (const id of Object.keys(notified)) {
      if (!validIds.has(id)) { delete notified[id]; changed = true; }
    }

    // GitHub Actionsの定期実行は数分ずれることがあるため、しきい値を過ぎたあとも
    // 締切から30分後までは「遅れて届く」形で拾う（完全に無視されるよりはよい）
    const GRACE_MS = 30 * 60000;
    const toSend = [];
    for (const it of items) {
      if (!it.date || !it.time) continue;
      const target = targetMs(it.date, it.time);
      if (target == null) continue;
      const notifyAt = target - minutes * 60000;
      if (now >= notifyAt && now < target + GRACE_MS && !notified[it.id]) {
        toSend.push(it);
        notified[it.id] = true;
        changed = true;
      }
    }

    console.log(`  toSend=${toSend.length} subs=${subs.length}`);
    if (!toSend.length) {
      if (changed) await doc.ref.update({ notified });
      continue;
    }

    const keepSubs = [];
    for (const sub of subs) {
      let subOk = true;
      for (const it of toSend) {
        const payload = JSON.stringify({
          title: it.title + "（" + minutes + "分前）",
          body: (it.date || "") + (it.time ? " " + it.time : "") + (it.note ? "\n" + it.note : ""),
          tag: "sched-" + it.id
        });
        try {
          await webpush.sendNotification(sub, payload);
          console.log(`  sent ok -> ${doc.id}`);
        } catch (err) {
          console.error(`  send failed -> ${doc.id} status=${err.statusCode} msg=${err.message}`);
          if (err.statusCode === 404 || err.statusCode === 410) subOk = false;
        }
      }
      if (subOk) keepSubs.push(sub);
    }

    await doc.ref.update({ notified, subs: keepSubs });
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
