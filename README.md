# paperscreen-lp

Paperscreen の紹介ページ。GitHub Pages で配信する。

- <https://kishiyyyyy.github.io/paperscreen-lp/>

アプリ本体は非公開リポジトリ `kishiyyyyy/PaperScreen`。プライバシーポリシーと
サポートページは `kishiyyyyy/paperscreen-support` にあり、こことは別に置いてある。
理由は本体リポジトリの `docs/decisions.md`（このLPのビルドが壊れてもサポートURLが
404にならないようにするため。審査で落ちる）。

## 構成

| ファイル | 中身 |
| --- | --- |
| `index.html` | 日本語版の本文 |
| `en/index.html` | 英語版の本文 |
| `style.css` | 見た目。英語版は `html[lang="en"]` で欧文向けに上書きする |
| `demo.js` | デモの操作。日英で共有する |
| `paper.js` | 紙面の生成。製品からの移植 |
| `icon.svg` | ファビコン。`paperscreen-support` と同じもの |

ビルドは無い。素のHTMLをそのまま配信する。

## 破ってはいけないこと

**`paper.js` の数値をここで調整しない。** あの数値は製品の
`Sources/PaperSurface.swift` の `definition(for:)` の写しで、乱数の種まで同じ。
デモの見え方を変えたくなったら製品側を変えて、その値をここへ写す。

このページのデモは効果が弱い。それは欠陥ではなく仕様で、「オンにしていることを
忘れる程度」が製品の基準になっている。見栄えのために強くした時点で、このページは
買う前の人に嘘をつくことになる。実測では既定の Clear・55 で白が 2.9% 暗くなる。

同じ理由で**紙面の色見本を置かない**。カードに収まる大きさでは Warm と Quiet を
正直に描き分けられず、紙目は数パーセントのアルファなので「見えるように」描いた
時点で嘘のプレビューになる。製品のメニューでも同じ結論を出している。比較はボタンの
ホバーによるページ全体への仮適用に任せる（製品のメニューと同じ振る舞い）。

**Google Fonts などの第三者リソースを足さない。** 訪問者のIPを第三者に渡さない
ことが、製品が売りにしている中身と揃っている必要がある。Mac専用アプリなので
Hiragino がほぼ確実に当たる。

**事実を書く前に実測を確かめる。** 最初の草稿には「メモリ50MB未満」（実測103MB）と
「ログイン時に開くが既定オン」（実際はopt-inで既定オフ。審査ガイドライン
2.4.5(iii) のため）があった。数字と既定値は本体の `README.md` と
`docs/decisions.md` が正。

表記は `Paperscreen`。大文字は先頭のPだけ。`PaperScreen` と書かない。
`Clear` / `Warm` / `Quiet` も訳さない。紙面の名前は製品の識別子で、Night Shift が
訳されないのと同じ扱い。メニューの語（`Surface`、`Intensity`、`Reset to Default`、
`Open at Login`、`Quit Paperscreen`、`Daytime` / `Reading` / `Evening`）は製品の
`Resources/{en,ja}.lproj/Localizable.strings` が正。

**「眼精疲労」「eye strain」を使わない。** 症状を指す語（まぶしさ、glare）は使う。
医療効果をうたう表現も使わない。

## 残っていること

- [ ] App Store の URL が出たら、closing セクションの段落をボタンに差し替える
- [ ] OG画像。`./build.sh shot` で素の画面写真に紙面を合成して作る
