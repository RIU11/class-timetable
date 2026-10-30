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

  for (const doc of snap.docs) {
    const data = doc.data();
    const notif = data.notif || {};
    if (!notif.enabled) continue;

    const subs = Array.isArray(data.subs) ? data.subs : [];
    if (!subs.length) continue;

    const minutes = Number(notif.minutes) || 10;
    const items = Array.isArray(data.sched) ? data.sched : [];
    const notified = { ...(data.notified || {}) };
    const validIds = new Set(items.map((it) => it.id));
    let changed = false;

    for (const id of Object.keys(notified)) {
      if (!validIds.has(id)) { delete notified[id]; changed = true; }
    }

    const toSend = [];
    for (const it of items) {
      if (!it.date || !it.time) continue;
      const target = targetMs(it.date, it.time);
      if (target == null) continue;
      const notifyAt = target - minutes * 60000;
      if (now >= notifyAt && now < target && !notified[it.id]) {
        toSend.push(it);
        notified[it.id] = true;
        changed = true;
      }
    }

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
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) subOk = false;
          else console.error("push error", doc.id, err.statusCode, err.message);
        }
      }
      if (subOk) keepSubs.push(sub);
    }

    await doc.ref.update({ notified, subs: keepSubs });
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
