// ここに、あなたのFirebaseプロジェクトの設定値を入れてください。
// Firebaseコンソール →（歯車アイコン）プロジェクトの設定 → 全般 → 「マイアプリ」→ ウェブアプリの設定（SDKの設定と構成）に出てくる値です。
// アプリをまだ作っていなければ、同じ画面の「</> アプリを追加」からウェブアプリを登録してください。
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 通知の送信元を証明する公開鍵（VAPID公開鍵）。これは秘密ではないので、そのままで大丈夫です。
window.VAPID_PUBLIC_KEY = "BA3hGTImc3zbCw19Xsw37QT1058RlbhY1TWz9ZttJagMxxqxlLOj6YILrnq_WuaLGZSKA69IiKfiLjRkpGYSM9w";
