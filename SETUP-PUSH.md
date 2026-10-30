# 「アプリを閉じていても通知が届く」ようにする設定手順

クレジットカード登録もFirebaseの有料プラン（Blaze）も不要です。使うのは次の3つで、すべて無料です。

- **Firebase の Firestore（無料のSparkプランのまま）**：各自の予定・通知設定を保存する場所
- **GitHub Actions**：5分おきに自動実行される、無料の定期実行の仕組み（このリポジトリに最初から含まれる）
- **Web Push**：ブラウザ標準の通知の仕組み（VAPID鍵というもので送信元を証明する）

コードはすべて用意済みです。あなたにやってもらう必要があるのは、**アカウントの設定作業**（私にはログインできないため）だけです。上から順に進めてください。

---

## 1. Firebaseで Firestore と 匿名ログイン を有効にする

1. [Firebaseコンソール](https://console.firebase.google.com/) で、前に作ったプロジェクトを開く
2. 左メニュー「構築」→「Firestore Database」→「データベースの作成」
   - ロケーションは `asia-northeast1`（東京）など好きな場所でOK
   - 本番モード／テストモードはどちらでもいいですが、下の手順3でルールを上書きするので「テストモード」で始めて構いません
3. 左メニュー「構築」→「Authentication」→「始める」→「Sign-in method」タブ→「匿名」を選んで有効にする
   - これは、各端末を見分けるためだけに使うもので、ログイン画面は一切出ません

## 2. Firestoreのセキュリティルールを設定する

Firestore Database →「ルール」タブで、以下に書き換えて「公開」：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

（これで、各端末は自分のデータしか読み書きできません。GitHub Actions側は別の方法でアクセスするので、これとは関係なく動きます）

## 3. ウェブアプリを登録して、設定値を `firebase-config.js` に貼る

1. プロジェクトの設定（歯車アイコン）→「全般」タブ→ 下の方の「マイアプリ」→「`</>`」（ウェブ）のアイコンでアプリを追加
   - アプリのニックネームは何でもOK（例：時間割アプリ）
   - 「Firebase Hosting も設定する」のチェックは不要（GitHub Pagesを使うため）
2. 表示される `firebaseConfig = {...}` の中身を、このフォルダの **`firebase-config.js`** の `window.FIREBASE_CONFIG` にそのままコピーしてください（`apiKey`・`authDomain`・`projectId`・`storageBucket`・`messagingSenderId`・`appId` の6つ）
   - これらは公開されても問題ない値です（Firestoreのセキュリティルールの方で守られています）

## 4. サービスアカウントの鍵を作って、GitHubのSecretsに登録する

これは GitHub Actions が Firestore を読み書きするための、管理者権限の鍵です。**これだけは本当の秘密情報なので、リポジトリには絶対に入れず、GitHubのSecretsにだけ登録します。**

1. プロジェクトの設定 →「サービス アカウント」タブ→「新しい秘密鍵の生成」→ JSONファイルがダウンロードされる
2. GitHubでこのリポジトリを開く →「Settings」タブ →左メニュー「Secrets and variables」→「Actions」→「New repository secret」
3. 次の4つを登録する：

   | Name | Value |
   |---|---|
   | `FIREBASE_SERVICE_ACCOUNT` | さっきダウンロードしたJSONファイルの中身を、まるごとコピペ |
   | `VAPID_PUBLIC_KEY` | `firebase-config.js` に書いてある `window.VAPID_PUBLIC_KEY` の値と同じもの |
   | `VAPID_PRIVATE_KEY` | チャットでこちらが伝えた秘密鍵の値（**このファイルやリポジトリには書きません**） |
   | `VAPID_SUBJECT` | `https://riu11.github.io/class-timetable/` |

   ※ VAPID鍵は今回こちらで生成したものです。秘密鍵はチャット上でのみお伝えします。GitHubのSecretsにだけ登録し、それ以外のファイルには絶対に貼らないでください（漏れると他人があなたの名前で通知を送れてしまいます）。

## 5. 変更をGitHubに反映する

`firebase-config.js` を書き換えたら、その変更をコミット・プッシュしてください（私が代わりにやることもできます。声をかけてください）。

## 6. 動作確認する

1. GitHubのリポジトリ →「Actions」タブ →左の「schedule-push-check」→右上「Run workflow」で手動実行してみる
   - エラーが出ていないか確認（緑のチェックが付けばOK）
2. スマホまたはパソコンでアプリを開く → スケジュールタブ → ベルのボタン → 通知をオンにする（ブラウザの通知許可を求められたら「許可」）
3. 試しに、1〜2分後の時刻でスケジュールを追加し、「何分前」を5分にして登録
4. GitHub Actionsは5分おきに動くので、最大で5分ほど待ってから、手動実行（上の1と同じ）して通知が届くか確認
   - ※ 実際の運用では自動で5分おきに動くので、手動実行しなくても大丈夫です

---

## 知っておいてほしいこと

- **GitHub Actionsの5分おき実行には、数分前後のズレが出ることがあります**（混雑状況による、GitHub側の仕様）。「5分前」のようにギリギリの設定だと、通知が間に合わない・遅れることがあるので、大事な締切は余裕を持って「15分前」「30分前」くらいを選ぶのがおすすめです。
- 通知をオンにすると、あなたの**予定の内容（日付・時間・タイトル・メモ）が、あなたのFirebaseプロジェクトのFirestoreに一時的に保存されます**（今までは端末の中だけでした）。見るのはあなた自身（とFirebaseの管理者権限を持つあなた）だけですが、設計として「完全に端末内で完結」ではなくなる点は押さえておいてください。
- iPhoneの場合、Safariでアプリを開くだけでなく、**ホーム画面に追加して、そこから開く必要があります**（iOS 16.4以降）。
