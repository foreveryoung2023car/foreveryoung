// Dynamic status, validation and workflow copy; source keys remain stable.
Object.assign(window.ADMIN_I18N_CATALOG, Object.fromEntries(`
例：|例：|例：|e.g. 
例：小林|例：小林|例：小林|e.g. Kobayashi
例：華南銀行|例：华南银行|例：華南銀行|e.g. Hua Nan Bank
例：營業部|例：营业部|例：営業部|e.g. Main branch
最近|最近|直近|Latest
項|项|項目|items
日|日|日|Sun
一|一|月|Mon
二|二|火|Tue
三|三|水|Wed
四|四|木|Thu
五|五|金|Fri
六|六|土|Sat
週日|周日|日曜日|Sunday
週一|周一|月曜日|Monday
週二|周二|火曜日|Tuesday
週三|周三|水曜日|Wednesday
週四|周四|木曜日|Thursday
週五|周五|金曜日|Friday
下午|下午|午後|PM
上午|上午|午前|AM
是|是|はい|Yes
否|否|いいえ|No
請填入 Email 與密碼|请填写 Email 和密码|メールとパスワードを入力してください|Enter email and password
請填入姓名與密碼|请填写姓名和密码|氏名とパスワードを入力してください|Enter name and password
密碼錯誤，請再試一次|密码错误，请重试|パスワードが違います。再試行してください|Incorrect password. Please try again
無法連線到伺服器，請稍後再試|无法连接服务器，请稍后重试|サーバーに接続できません。後でもう一度お試しください|Cannot connect to the server. Please try again later
正在確認登入狀態…|正在确认登录状态…|ログイン状態を確認中…|Checking sign-in status…
請稍等，系統會直接載入目前帳號|请稍等，系统会直接载入当前账号|現在のアカウントを読み込みます。お待ちください|Please wait while we load your current account
Firebase Auth 初始化失敗|Firebase Auth 初始化失败|Firebase Authの初期化に失敗しました|Firebase Auth initialization failed
Firebase SDK 載入失敗，請重新整理後再試|Firebase SDK 载入失败，请刷新后重试|Firebase SDKを読み込めません。更新して再試行してください|Firebase SDK failed to load. Refresh and try again
登入失敗|登录失败|ログインできませんでした|Sign-in failed
此帳號未啟用|此账号未启用|このアカウントは無効です|This account is disabled
尚未登入|尚未登录|未ログイン|Not signed in
目前帳號沒有員工管理權限|当前账号没有员工管理权限|このアカウントにはスタッフ管理権限がありません|Your account cannot manage employees
只有 owner 可查看此頁面|仅 owner 可查看此页面|このページはownerのみ閲覧できます|Only owners can view this page
已更新|已更新|更新しました|Updated
已重新載入（找不到該筆）|已重新载入（找不到该条记录）|再読込しました（該当データなし）|Reloaded (record not found)
該筆不在目前篩選範圍|该记录不在当前筛选范围|現在の絞り込み条件の対象外です|This record is outside the current filters
載入失敗|载入失败|読み込みに失敗しました|Loading failed
連線失敗|连接失败|接続に失敗しました|Connection failed
找不到訂單|找不到订单|予約が見つかりません|Order not found
儲存失敗|保存失败|保存に失敗しました|Save failed
退款原因|退款原因|返金理由|Refund reason
退款已標記為已匯出 ✓|退款已标记为已汇出 ✓|返金を振込済みにしました ✓|Refund marked as transferred ✓
確認已完成退款給「|确认已完成退款给“|次のお客様への返金振込が完了しましたか：「|Confirm the refund transfer to “
」的匯款？|”的汇款？|」|” is complete?
確認「|确认“|確認：「|Confirm “
」已收齊尾款？|”已收齐尾款？|」の残金を全額受領しましたか？|” has paid the full balance?
已標記收齊尾款 ✓|已标记尾款已付清 ✓|残金支払済みにしました ✓|Marked balance as paid ✓
」標記為「未收齊」？|”标记为“未付清”？|」を「未収」にしますか？|” as not fully paid?
已完成訂單不可還原。|已完成订单不可还原。|完了した予約は元に戻せません。|Completed orders cannot be reverted.
已取消標記|已取消标记|マークを解除しました|Mark removed
範圍內全部訂單|范围内全部订单|期間内のすべての予約|All orders in this period
筆需處理|笔待处理|件の対応が必要|orders need attention
已全部處理|已全部处理|すべて対応済み|All handled
待到店比例|待到店比例|来店待ちの割合|Awaiting arrival
平均每筆|平均每笔|1件平均|Average per order
待付尾款訂單|待付尾款订单|残金未払いの予約|Orders with balance due
無退款|无退款|返金なし|No refunds
筆訂單入帳|笔订单入账|件入金済み|orders received
今天還沒入帳|今天尚未入账|本日の入金はまだありません|No receipts today
新進退款申請|新退款申请|新規返金申請|New refund request
客人已填銀行帳號，待客服確認金額|客人已填银行账号，待客服确认金额|口座入力済み、スタッフの金額確認待ち|Bank details provided; staff must confirm the amount
訂金超收|订金超收|予約金超過入金|Deposit overpayment
已收|已收|受領済み|Received
體驗|体验|体験|Experience
小時|小时|時間|hours
客人匯款後客服未確認|客人汇款后客服未确认|お客様の振込後、スタッフ未確認|Customer transferred payment; awaiting staff review
已確認待匯款|已确认待汇款|確認済み・振込待ち|Confirmed, awaiting transfer
待匯款|待汇款|振込待ち|Awaiting transfer
實際匯款後按「✓ 已完成匯款」|实际汇款后点击“✓ 已完成汇款”|実際の振込後に「✓ 振込完了」を押してください|After transferring, click “✓ Transfer completed”
已完成匯款|已完成汇款|振込完了|Transfer completed
預約日|预约日|予約日|Booking date
無名|无名|氏名なし|Unnamed
資料不完整：缺|资料不完整：缺|情報不足：未入力|Incomplete details: missing
緊急處理|紧急处理|至急対応|Urgent
提醒注意|提醒注意|注意|Attention
系統提示|系统提示|システム通知|System notice
查看全部|查看全部|すべて表示|View all
未指定|未指定|未指定|Unassigned
未填|未填写|未入力|Not provided
明天|明天|明日|Tomorrow
未知狀態|未知状态|不明な状態|Unknown status
點擊修改訂單狀態|点击修改订单状态|クリックして予約状態を変更|Click to change order status
目前帳號不可修改狀態|当前账号不可修改状态|このアカウントは状態を変更できません|Your account cannot change status
此狀態不可切換到「|此状态不能切换到“|この状態から変更できません：「|Cannot change this status to “
確認取消訂單「|确认取消订单“|予約をキャンセルしますか：「|Cancel order “
取消後狀態會變為「已取消」，請確認客人確實取消，且此操作已完成內部確認。|取消后状态变为“已取消”，请确认客人确实取消且已完成内部确认。|状態が「キャンセル済み」になります。お客様のキャンセルと社内確認が完了していることを確認してください。|The status will become Cancelled. Verify the customer cancelled and internal approval is complete.
確認恢復已取消訂單「|确认恢复已取消订单“|キャンセル済み予約を復元しますか：「|Restore cancelled order “
此操作僅 owner 可執行，請確認訂單需要重新進入流程。|此操作仅 owner 可执行，请确认订单需要重新进入流程。|ownerのみ実行できます。予約を再開する必要があるか確認してください。|Only owners can do this. Confirm the order should re-enter the workflow.
確認將訂單「|确认将订单“|予約「|Change order “
」改為「|”改为“|」を次の状態に変更しますか：「|” to “
狀態已更新為「|状态已更新为“|状態を更新しました：「|Status updated to “
狀態更新失敗|状态更新失败|状態更新に失敗しました|Status update failed
查看|查看|表示|View
退款流程|退款流程|返金フロー|Refund workflow
狀態|状态|状態|Status
起日|开始日期|開始日|Start date
迄日|结束日期|終了日|End date
款式|款式|種類|Style
來源|来源|経路|Source
妝髮|妆发|ヘアメイク|Hair and makeup
請輸入報到門市代號 (kyoto1 / kyoto2 / osaka1 / tokyo1)：|请输入报到门店代码 (kyoto1 / kyoto2 / osaka1 / tokyo1)：|来店受付の店舗コードを入力 (kyoto1 / kyoto2 / osaka1 / tokyo1)：|Enter check-in store code (kyoto1 / kyoto2 / osaka1 / tokyo1):
門市代號錯誤|门店代码错误|店舗コードが正しくありません|Invalid store code
請輸入客人手機末 3 碼（驗證身份）：|请输入客人手机末 3 位（验证身份）：|本人確認のため電話番号の下3桁を入力：|Enter the last 3 digits of the customer's phone to verify identity:
請輸入客人手機末 3 碼，必須是 3 位數字。|请输入客人手机末 3 位，必须是 3 位数字。|電話番号の下3桁を数字3文字で入力してください。|Enter exactly 3 digits from the end of the customer's phone number.
手機末 3 碼不符（客人輸入：|手机末 3 位不符（客人输入：|電話番号の下3桁が一致しません（入力値：|Phone digits do not match (customer entered:
，記錄：|，记录：|、記録：|, recorded:
）。仍要報到？|）。仍要报到？|）。来店受付を続けますか？|). Check in anyway?
確定為「|确定为“|次のお客様の来店受付を行いますか：「|Check in “
」辦理報到？|”办理报到？|」|”?
體驗日|体验日|体験日|Visit date
報到失敗|报到失败|来店受付に失敗しました|Check-in failed
已報到|已报到|来店受付済み|Checked in
未知錯誤|未知错误|不明なエラー|Unknown error
網路異常|网络异常|ネットワークエラー|Network error
選取的訂單中沒有可推進到「待到店」的待確認訂單。|选中的订单没有可更新为“待到店”的待确认订单。|選択した予約に「来店待ち」へ進められる確認待ちの予約はありません。|No selected orders can advance from pending review to awaiting arrival.
確定將|确定将|次を確定しますか：|Confirm
筆待確認訂單推進為「待到店」嗎？|笔待确认订单更新为“待到店”吗？|件の確認待ち予約を「来店待ち」に変更|pending orders to awaiting arrival?
完成：成功|完成：成功|完了：成功|Complete: succeeded
筆，失敗|笔，失败|件、失敗|orders, failed
沒有可儲存的變更|没有可保存的更改|保存する変更はありません|No changes to save
已複製|已复制|コピーしました|Copied
未知|未知|不明|Unknown
筆訂單|笔订单|件の予約|orders
請使用 Firebase 後台儲存對帳|请使用 Firebase 后台保存对账|Firebase管理画面で照合表を保存してください|Use the Firebase admin portal to save reconciliation
儲存未獲確認，請重新載入後確認訂單|保存未获确认，请重新载入后检查订单|保存を確認できません。再読込して予約を確認してください|Save was not confirmed. Reload and check the order
金額需為大於或等於 0 的整數|金额必须是大于等于 0 的整数|金額は0以上の整数で入力してください|Amounts must be non-negative integers
目前的舊版資料服務不支援自動推進狀態與寄送憑證信|当前旧版数据服务不支持自动更新状态与发送凭证邮件|旧データサービスは状態の自動更新と証明メール送信に対応していません|The legacy service does not support automatic status updates or receipt emails
沒有需要儲存的變更|没有需要保存的更改|保存する変更はありません|No changes to save
確認儲存|确认保存|保存を確認|Confirm saving
筆對帳資料？|笔对账资料？|件の照合データを保存しますか？|reconciliation records?
其中|其中|うち|Of these,
筆會依尾款更新為「已完成」或「待付尾款」，並寄送付款憑證信。|笔将按尾款更新为“已完成”或“待付尾款”，并发送付款凭证邮件。|件を残金に応じて「完了」または「残金支払い待ち」に更新し、支払い証明メールを送信します。|records will be marked completed or balance due based on the balance, and receipt emails will be sent.
儲存中|保存中|保存中|Saving
已儲存|已保存|保存しました|Saved
筆失敗|笔失败|件失敗|records failed
封憑證信未寄出|封凭证邮件未发送|通の証明メールが未送信|receipt emails not sent
筆對帳變更|笔对账更改|件の照合変更|reconciliation changes
並已更新狀態及寄送憑證信|并已更新状态及发送凭证邮件|状態更新と証明メール送信も完了しました|Status updated and receipt emails sent
店鋪利潤|店铺利润|店舗利益|Store profit
需付平台|需付平台|プラットフォームへの支払額|Due to platform
平台費|平台费|プラットフォーム手数料|Platform fee
需收店鋪|需向门店收取|店舗からの受取額|Due from store
平台|平台|プラットフォーム|Platform
折扣與退款|折扣与退款|割引・返金|Discounts and refunds
實際收款|实际收款|実入金額|Actual receipts
已匯出對帳資料|已导出对账数据|照合データを出力しました|Reconciliation exported
已對帳|已对账|照合済み|Reconciled
超收異常|超收异常|超過入金|Overpayment
未收訂金|未收订金|予約金未収|Deposit not received
訂金不足|订金不足|予約金不足|Insufficient deposit
已收款待確認|已收款待确认|入金済み・確認待ち|Received, awaiting review
需要主管權限|需要主管权限|管理者権限が必要です|Manager permission required
正在掃描収款辨識|正在扫描收款识别|入金識別をスキャン中|Scanning payment recognition
掃描失敗|扫描失败|スキャンに失敗しました|Scan failed
套用中|应用中|適用中|Applying
套用失敗|应用失败|適用に失敗しました|Apply failed
已自動配對|已自动匹配|自動照合しました|Auto-matched
人數|人数|人数|Guests
訂金|订金|予約金|Deposit
和服|和服|着物|Kimono
總計|总计|合計|Total
確認|确认|確認|Confirm
已確認|已确认|確認済み|Confirmed
無資料可匯出|无数据可导出|出力するデータがありません|No data to export
已匯出 CSV|已导出 CSV|CSVを出力しました|CSV exported
請先選取訂單|请先选择订单|先に予約を選択してください|Select orders first
已匯出|已导出|出力しました|Exported
訂單詳情開啟失敗|订单详情打开失败|予約詳細を開けませんでした|Could not open order details
填單|填单|作成|Created
有妝髮|有妆发|ヘアメイクあり|With styling
無妝髮|无妆发|ヘアメイクなし|No styling
儲存並完成結帳|保存并完成结账|保存して精算完了|Save and complete checkout
缺姓名|缺少姓名|氏名未入力|Missing name
缺電話|缺少电话|電話未入力|Missing phone
缺預約日|缺少预约日期|予約日未入力|Missing booking date
訂金「超收」|订金“超收”|予約金の超過入金|Deposit overpayment
實收|实收|実収|Received
必須退款|必须退款|返金が必要|Refund required
退款金額已填但未填退款時間|已填退款金额但未填退款时间|返金額は入力済みですが、返金日時が未入力です|Refund amount entered but refund time is missing
待確認超過 24 小時|待确认超过 24 小时|確認待ちが24時間を超過|Pending review for over 24 hours
銀行|银行|銀行|Bank
原因|原因|理由|Reason
已填入退款時間|已填写退款时间|返金日時を入力しました|Refund time filled
主管|主管|管理者|Supervisor
店家|门店|店舗|Store
已同步|已同步|同期済み|Synced
已開啟|已开启|有効化しました|Enabled
已關閉|已关闭|無効化しました|Disabled
最高管理者|最高管理员|最上位管理者|Owner
全局管理者|全局管理员|全体管理者|Global administrator
總店長|总店长|統括店長|Head store manager
店家後台，可看四店訂單|门店后台，可查看四店订单|店舗管理画面で4店舗の予約を閲覧可能|Store portal with access to all four stores
店鋪管理者|店铺管理员|店舗管理者|Store manager
限自己店鋪|仅限自己店铺|自店舗のみ|Own store only
客服|客服|サポート|Support
店員|店员|スタッフ|Store staff
會計|会计|会計担当|Accountant
唯讀|只读|読み取り専用|Read-only
管理者|管理员|管理者|Administrator
店長|店长|店長|Store manager
已捨棄未儲存的變更|已放弃未保存的更改|未保存の変更を破棄しました|Unsaved changes discarded
已重置為預設權限|已重置为默认权限|既定の権限に戻しました|Permissions reset to defaults
只有 Jun 可以執行|仅 Jun 可以执行|Junのみ実行できます|Only Jun can perform this action
正在預檢|正在预检|事前確認中|Checking
預檢失敗|预检失败|事前確認に失敗しました|Precheck failed
本月無訂單可關帳|本月无订单可关账|今月は締め対象の予約がありません|No orders to close this month
預檢結果|预检结果|事前確認結果|Precheck results
訂單筆數|订单笔数|予約件数|Order count
可以關帳！|可以关账！|締め処理が可能です！|Ready to close!
要立刻關帳嗎？|是否立即关账？|今すぐ締めますか？|Close now?
筆未對帳|笔未对账|件未照合|unreconciled orders
全站搜尋|全站搜索|全体検索|Global search
所有人|所有人|全員|Everyone
只有客服|仅客服|サポートのみ|Support only
只有店家|仅门店|店舗のみ|Stores only
只有 Jun|仅 Jun|Junのみ|Jun only
只有 Jun 可以執行關帳|仅 Jun 可以执行关账|Junのみ締め処理を実行できます|Only Jun can close a month
請先選擇一個月份|请先选择月份|先に月を選択してください|Select a month first
未到月份不能關帳|不能对未来月份关账|将来の月は締められません|Cannot close a future month
無法關帳|无法关账|締め処理できません|Cannot close month
關帳中|关账中|締め処理中|Closing
已關帳|已关账|締め済み|Closed
筆訂單已歸檔|笔订单已归档|件をアーカイブしました|orders archived
關帳失敗|关账失败|締め処理に失敗しました|Closing failed
明細|明细|明細|Details
只有 Jun 可以解凍|仅 Jun 可以解冻|Junのみ再開できます|Only Jun can reopen a month
解凍中|解冻中|再開中|Reopening
已解凍|已解冻|再開しました|Reopened
筆訂單回到主表|笔订单已返回主表|件の予約をメイン表に戻しました|orders returned to main table
解凍失敗|解冻失败|再開に失敗しました|Reopen failed
確認提交本次消費與付款金額？|确认提交本次消费与付款金额？|今回の利用額と支払額を確定しますか？|Submit the purchase and payment amounts?
儲存後狀態將變為「|保存后状态将变为“|保存後の状態：「|After saving, the status will be “
」，店鋪端不可再修改。|”，门店端不能再修改。|」。店舗からは変更できなくなります。|”; the store will no longer be able to edit it.
此模式尚不支援店鋪備註更新|此模式尚不支持更新店铺备注|このモードは店舗メモの更新に未対応です|This mode does not support store note updates
已儲存店鋪備註|已保存店铺备注|店舗メモを保存しました|Store notes saved
付款憑證信已寄出|付款凭证邮件已发送|支払い証明メールを送信しました|Payment receipt email sent
但付款憑證信寄送失敗|但付款凭证邮件发送失败|ただし支払い証明メールの送信に失敗しました|But the payment receipt email failed
正在重新載入|正在重新载入|再読み込み中|Reloading
重新載入中|重新载入中|再読み込み中|Reloading
失敗|失败|失敗|Failed
未命名|未命名|名称なし|Unnamed
京都|京都|京都|Kyoto
大阪|大阪|大阪|Osaka
東京|东京|東京|Tokyo
晴|晴|晴れ|Clear
多雲|多云|曇り|Cloudy
霧|雾|霧|Fog
毛雨|毛毛雨|霧雨|Drizzle
雨|雨|雨|Rain
雪|雪|雪|Snow
陣雨|阵雨|にわか雨|Showers
雷雨|雷雨|雷雨|Thunderstorm
本地時間|当地时间|現地時間|Local time
報到|报到|来店受付|Check in
待報到|待报到|来店受付待ち|Awaiting check-in
客人自助|客人自助|お客様セルフ受付|Customer self check-in
已代客報到|已为客人报到|代理受付済み|Checked in by staff
為客人報到|为客人报到|お客様を受付|Check in customer
大阪日本橋店|大阪日本桥店|大阪日本橋店|Osaka Nipponbashi
京都祇園店|京都祇园店|京都祇園店|Kyoto Gion
東京淺草寺店|东京浅草寺店|東京浅草寺店|Tokyo Asakusa
清水寺|清水寺|清水寺|Kiyomizudera
日本橋|日本桥|日本橋|Nipponbashi
祇園|祇园|祇園|Gion
淺草|浅草|浅草|Asakusa
未分類|未分类|未分類|Uncategorized
只有 Jun 可以查看操作紀錄|仅 Jun 可查看操作记录|Junのみ操作ログを閲覧できます|Only Jun can view audit logs
無法取得 Firebase 操作紀錄|无法获取 Firebase 操作记录|Firebaseの操作ログを取得できません|Cannot load Firebase audit logs
無法取得紀錄|无法获取记录|履歴を取得できません|Cannot load records
關帳|关账|締め処理|Close month
解凍|解冻|再開|Reopen
現場訂單|现场订单|当日来店予約|Walk-in order
確認信|确认邮件|確認メール|Confirmation email
退款確認信|退款确认邮件|返金確認メール|Refund confirmation email
預約前一日提醒信|预约前一天提醒邮件|来店前日リマインダー|Day-before reminder email
付款憑證收到通知|付款凭证接收通知|支払い証明受領通知|Payment proof received notice
請先選一筆訂單|请先选择一笔订单|先に予約を1件選択してください|Select an order first
該訂單沒有 email，無法寄送。請先填入 email 並儲存。|订单没有 email，无法发送。请先填写 email 并保存。|メールアドレスがありません。入力して保存してから送信してください。|This order has no email address. Add and save one before sending.
確定寄出|确认发送|送信を確認|Confirm sending
寄送中|发送中|送信中|Sending
已寄出|已发送|送信しました|Sent
寄送失敗|发送失败|送信に失敗しました|Sending failed
此信件功能已改用 Firebase，請先登入 Firebase 後台。|邮件功能已改用 Firebase，请先登录 Firebase 后台。|メール機能はFirebaseへ移行しました。Firebase管理画面にログインしてください。|Email now uses Firebase. Sign in to the Firebase admin portal first.
已寄出確認信|已发送确认邮件|確認メールを送信しました|Confirmation email sent
網路錯誤|网络错误|ネットワークエラー|Network error
素雅和服|素雅和服|シンプル着物|Simple kimono
俏麗和服|俏丽和服|キュート着物|Charming kimono
精緻和服|精致和服|華やか着物|Elegant kimono
浴衣|浴衣|浴衣|Yukata
振袖|振袖|振袖|Furisode
男士和服|男士和服|男性着物|Men's kimono
武士袴|武士袴|武士袴|Samurai hakama
兒童和服|儿童和服|子ども着物|Children's kimono
請填客人姓名|请填写客人姓名|お客様の氏名を入力してください|Enter the customer's name
請填和服原價|请填写和服原价|着物の定価を入力してください|Enter the kimono list price
建單中|创建订单中|予約作成中|Creating order
現場訂單已建立！|现场订单已创建！|当日来店予約を作成しました！|Walk-in order created!
編號|编号|番号|ID
已寫入|已写入|記録しました|Recorded
建單失敗|创建订单失败|予約作成に失敗しました|Order creation failed
目前帳號沒有新增員工權限|当前账号无权新增员工|このアカウントはスタッフを追加できません|Your account cannot add employees
目前角色沒有新增後台使用者的權限|当前角色无权新增后台用户|この役割は管理画面ユーザーを追加できません|Your role cannot add admin users
店長新增帳號會固定綁定自己的店鋪|店长新增账号会固定绑定自己的店铺|店長が作成するアカウントは自店舗に固定されます|Accounts created by store managers are assigned to their own store
綁定店鋪後，該帳號只能查看/操作該店鋪資料；不綁定則按角色作全局權限|绑定店铺后只能查看/操作该店铺数据；不绑定则按角色授予全局权限|店舗を指定するとその店舗のみ操作可能です。未指定の場合は役割に応じた全体権限になります|Assigned accounts can only access that store; unassigned accounts use role-based global permissions
你的帳號已限制平台，新建帳號會固定沿用此平台範圍|你的账号已有平台限制，新账号将沿用此范围|アカウントのプラットフォーム制限は新規アカウントにも適用されます|New accounts inherit your account's platform restrictions
選擇此帳號可查看的訂單平台；Owner/Admin 不受店鋪限制，但仍受平台範圍限制|选择此账号可查看的订单平台；Owner/Admin 不受店铺限制，但仍受平台范围限制|閲覧可能なプラットフォームを選択。Owner/Adminもプラットフォーム制限は適用されます|Select accessible platforms. Owner/Admin bypass store restrictions, but not platform restrictions
Email 必填|Email 必填|メールは必須です|Email is required
姓名 + 密碼必填|姓名和密码必填|氏名とパスワードは必須です|Name and password are required
密碼至少 6 碼|密码至少 6 位|パスワードは6文字以上|Password must be at least 6 characters
處理中|处理中|処理中|Processing
已新增 Firebase 使用者|已新增 Firebase 用户|Firebaseユーザーを追加しました|Firebase user added
已新增員工|已新增员工|スタッフを追加しました|Employee added
新增失敗|新增失败|追加に失敗しました|Could not add
確定停用員工「|确认停用员工“|スタッフを無効化しますか：「|Disable employee “
停用後該員工無法登入。|停用后该员工无法登录。|無効化後、そのスタッフはログインできません。|The employee will no longer be able to sign in.
操作失敗|操作失败|操作に失敗しました|Action failed
已啟用|已启用|有効化しました|Enabled
重設「|重设“|パスワード再設定：「|Reset “
」的新密碼（至少 6 碼）：|”的新密码（至少 6 位）：|」の新しいパスワード（6文字以上）：|” password (at least 6 characters):
密碼已重設|密码已重设|パスワードを再設定しました|Password reset
Firebase 模式下請使用 Authentication 的重設密碼流程。|Firebase 模式下请使用 Authentication 的重设密码流程。|FirebaseモードではAuthenticationのパスワード再設定を使用してください。|In Firebase mode, use the Authentication password reset flow.
請填寫所有欄位|请填写所有字段|すべての項目を入力してください|Fill in all fields
新密碼至少 6 碼|新密码至少 6 位|新しいパスワードは6文字以上|New password must be at least 6 characters
兩次新密碼不一致|两次新密码不一致|新しいパスワードが一致しません|New passwords do not match
新密碼不能跟舊密碼一樣|新密码不能与旧密码相同|新しいパスワードは現在のものと異なる必要があります|New password must differ from the current password
密碼已修改|密码已修改|パスワードを変更しました|Password changed
修改失敗|修改失败|変更に失敗しました|Change failed
無資料|无数据|データなし|No data
本期無退款記錄|本期无退款记录|当期の返金履歴はありません|No refunds this period
月份|月份|月|Month
總營收|总营收|売上合計|Total revenue
淨營收|净营收|純売上|Net revenue
累積消費|累计消费|累計利用額|Total spending
首次預約|首次预约|初回予約|First booking
最後預約|最后预约|最終予約|Last booking
詳情|详情|詳細|Details
天前|天前|日前|days ago
天後|天后|日後|days later
`.trim().split('\n').map(line => { const [key, ...values] = line.split('|'); return [key, values]; })));
Object.assign(window.ADMIN_I18N_CATALOG, Object.fromEntries(`
載入營業時段中|正在载入营业时段|営業時間を読み込み中|Loading business hours
尚未設定優惠碼。|尚未设置优惠码。|クーポンは未設定です。|No coupons configured.
尚未設定起訖日期|尚未设置起止日期|開始日・終了日が未設定|Start and end dates not set
待補日期|待补充日期|日付入力待ち|Dates required
未指定店鋪|未指定店铺|店舗未指定|No store assigned
停用|停用|無効化|Disable
優惠碼需為 2–32 位英文字母、數字、底線或連字號。|优惠码需为 2–32 位英文字母、数字、下划线或连字符。|クーポンは英数字・アンダースコア・ハイフンの2〜32文字で入力してください。|Coupon codes must contain 2–32 letters, digits, underscores or hyphens.
折數必須大於 0 且小於 10，例如 9 代表 9 折。|折数必须大于 0 且小于 10，例如 9 代表 9 折。|掛け率は0より大きく10未満にしてください。9は定価の90%です。|The multiplier must be greater than 0 and less than 10. For example, 9 means 90% of list price.
請設定優惠碼的開始日期與結束日期。|请设置优惠码的开始和结束日期。|クーポンの開始日と終了日を設定してください。|Set the coupon start and end dates.
結束日期不能早於開始日期。|结束日期不能早于开始日期。|終了日は開始日以降にしてください。|End date cannot be before start date.
請至少選擇一個適用店鋪。|请至少选择一个适用店铺。|対象店舗を1つ以上選択してください。|Select at least one eligible store.
優惠碼已儲存|优惠码已保存|クーポンを保存しました|Coupon saved
優惠碼已啟用|优惠码已启用|クーポンを有効化しました|Coupon enabled
優惠碼已停用|优惠码已停用|クーポンを無効化しました|Coupon disabled
確定刪除優惠碼「|确认删除优惠码“|クーポンを削除しますか：「|Delete coupon “
」？刪除後無法復原。|”？删除后无法恢复。|」？削除すると復元できません。|”? This cannot be undone.
優惠碼已刪除|优惠码已删除|クーポンを削除しました|Coupon deleted
刪除失敗|删除失败|削除に失敗しました|Delete failed
刪除|删除|削除|Delete
尚未設定地址|尚未设置地址|住所未設定|Address not set
尚未設定電話|尚未设置电话|電話番号未設定|Phone not set
此日期已有個別設定|此日期已有单独设置|この日付は個別設定済みです|This date has custom settings
此日期目前沿用店鋪預設|此日期当前使用店铺默认设置|この日付は店舗の既定値を使用しています|This date uses store defaults
店鋪代號需為 2–32 位小寫英數字、底線或連字號。|店铺代码需为 2–32 位小写英文字母、数字、下划线或连字符。|店舗コードは英小文字・数字・アンダースコア・ハイフンの2〜32文字です。|Store codes must contain 2–32 lowercase letters, digits, underscores or hyphens.
請輸入店鋪名稱。|请输入店铺名称。|店舗名を入力してください。|Enter a store name.
店鋪已新增|店铺已新增|店舗を追加しました|Store added
店鋪信息已更新|店铺信息已更新|店舗情報を更新しました|Store details updated
確定更新此店預設時段？未個別設定的日期都會套用。|确认更新此店默认时段？未单独设置的日期都会应用。|既定の時間枠を更新しますか？個別設定のない日付に適用されます。|Update store default times? These apply to all dates without custom settings.
確定儲存|确认保存|保存しますか：|Save
的營業時段？|的营业时段？|の営業時間|business hours?
店鋪預設時段已更新|店铺默认时段已更新|店舗の既定時間枠を更新しました|Store default times updated
指定日期時段已更新|指定日期时段已更新|指定日の時間枠を更新しました|Selected date times updated
日幣折抵：男|日元抵扣：男|日本円充当額：男性|JPY credit: men
、女|、女|、女性|, women
平台設定不符，請重新載入|平台设置不匹配，请重新载入|プラットフォーム設定が一致しません。再読込してください|Platform settings do not match. Reload
載入平台設定失敗|载入平台设置失败|プラットフォーム設定を読み込めません|Could not load platform settings
只有 owner 可修改平台設定|仅 owner 可修改平台设置|プラットフォーム設定はownerのみ変更可能です|Only owners can edit platform settings
請先成功載入此平台的平台設定|请先成功载入此平台的设置|先にこのプラットフォームの設定を読み込んでください|Load this platform's settings first
請輸入有效的 http:// 或 https:// 聯絡連結|请输入有效的 http:// 或 https:// 联系链接|有効なhttp://またはhttps://の連絡先リンクを入力してください|Enter a valid http:// or https:// contact link
平台設定已儲存|平台设置已保存|プラットフォーム設定を保存しました|Platform settings saved
儲存平台設定失敗|保存平台设置失败|プラットフォーム設定を保存できません|Could not save platform settings
營業時段|营业时段|営業時間|Business hours
人數上限|人数上限|定員|Capacity
時段|时段|時間枠|Time slot
未對帳|未对账|未照合|Unreconciled
部分收款|部分收款|一部入金|Partially paid
未收款|未收款|未入金|Unpaid
已收款|已收款|入金済み|Paid
待對帳|待对账|照合待ち|Awaiting reconciliation
對帳狀態|对账状态|照合状態|Reconciliation status
完成率|完成率|完了率|Completion rate
請款單|请款单|請求書|Invoice
下載|下载|ダウンロード|Download
重設密碼|重设密码|パスワード再設定|Reset password
可查看平台|可查看平台|閲覧可能なプラットフォーム|Accessible platforms
全部店鋪|全部店铺|すべての店舗|All stores
登入|登录|ログイン|Sign in
權限|权限|権限|Permissions
筆數|笔数|件数|Count
客人|客人|お客様|Customer
訂單編號|订单编号|予約番号|Order number
付款|付款|支払い|Payment
和服金額|和服金额|着物料金|Kimono amount
合計|合计|合計|Total
大人|成人|大人|Adults
兒童|儿童|子ども|Children
完成，下一單元|完成，下一单元|完了、次のセクションへ|Done, next section
訓練|培训|トレーニング|Training
入門必看|入门必看|入門ガイド|Getting started
第一週新人先看這個|新人第一周先看这里|新人は最初の週に確認してください|Start here in your first week
日常操作|日常操作|日常業務|Daily operations
每天會用到的核心場景|每天会用到的核心场景|毎日使う主なシナリオ|Essential daily workflows
每日 SOP / 流程|每日 SOP / 流程|毎日の手順・フロー|Daily procedures
時間軸式工作流程|按时间顺序的工作流程|時系列の作業フロー|Chronological workflows
特殊 / 異常處理|特殊 / 异常处理|特殊ケース・例外対応|Special cases and exceptions
碰到狀況時怎麼辦|遇到问题时怎么办|問題が起きたときの対応|Handling problems
Jun 管理者進階|Jun 管理员进阶|Jun管理者向け上級ガイド|Advanced administration for Jun
只有 Jun 看得到|仅 Jun 可见|Junのみ閲覧可能|Visible to Jun only
各 tab 詳細導覽|各标签页详细导览|各タブの詳細ガイド|Detailed tab guides
單獨想複習某個 tab|单独复习某个标签页|特定のタブを復習|Review an individual tab
`.trim().split('\n').map(line => { const [key, ...values] = line.split('|'); return [key, values]; })));
Object.assign(window.ADMIN_I18N_CATALOG, Object.fromEntries(`
連線到後台超時|连接后台超时|管理サーバーへの接続がタイムアウトしました|Connection to admin server timed out
通常是 Google cookie 卡住|通常是 Google Cookie 导致|Google Cookieが原因の可能性があります|This is usually caused by Google cookies
清掉就會立刻好|清除后即可恢复|削除すると解決する場合があります|Clearing them may resolve the issue
清 cookie 並重新整理|清除 Cookie 并刷新|Cookieを削除して更新|Clear cookies and refresh
只重新整理（不清 cookie）|仅刷新（不清除 Cookie）|更新のみ（Cookieは保持）|Refresh only (keep cookies)
無痕模式 (Ctrl+Shift+N) 也可以避開|无痕模式 (Ctrl+Shift+N) 也可以解决|シークレットモード (Ctrl+Shift+N) でも回避できます|Incognito mode (Ctrl+Shift+N) may also help
訊息範本|消息模板|メッセージテンプレート|Message templates
複製|复制|コピー|Copy
太棒了！目前沒有待辦事項|目前没有待办事项|現在、対応が必要な項目はありません|You're all caught up!
處理|处理|対応|Handle
今天無預約|今天无预约|本日の予約はありません|No bookings today
今日時間軸|今日时间轴|本日のタイムライン|Today's timeline
已結帳|已结账|精算済み|Checked out
此期間無預約|此期间无预约|この期間の予約はありません|No bookings in this period
複製訊息範本|复制消息模板|テンプレートをコピー|Copy message template
點擊查看訂單詳細資料|点击查看订单详情|クリックして予約詳細を表示|Click to view order details
沒有符合條件的訂單|没有符合条件的订单|条件に一致する予約はありません|No matching orders
目前篩選條件|当前筛选条件|現在の絞り込み条件|Current filters
清除所有篩選|清除所有筛选|絞り込みをすべて解除|Clear all filters
目前沒有訂單資料|当前没有订单数据|予約データはありません|No order data yet
化妝|化妆|メイク|Makeup
已過|已过|経過|Past
今天到店|今天到店|本日来店|Arriving today
複製訂單編號|复制订单编号|予約番号をコピー|Copy order number
下單|下单|予約作成|Order placed
已複製電話|已复制电话|電話番号をコピーしました|Phone number copied
待匯|待汇款|振込待ち|Transfer pending
已匯|已汇款|振込済み|Transferred
此日無預約|此日无预约|この日の予約はありません|No bookings on this date
無客戶資料|无客户数据|顧客データはありません|No customer data
退款次數|退款次数|返金回数|Refund count
訂單記錄|订单记录|予約履歴|Order history
全部年份|全部年份|すべての年|All years
全年|全年|年間|Full year
本期無資料|本期无数据|当期のデータはありません|No data this period
已關帳並歸檔|已关账并归档|締め・アーカイブ済み|Closed and archived
該月訂單已從主表搬到「歷史檔案」分頁|该月订单已从主表移至“历史档案”|この月の予約はメイン表から「アーカイブ」に移動しました|This month's orders were moved to Archives
前往歷史檔案查看|前往历史档案查看|アーカイブを表示|View archives
沒有訂單資料|没有订单数据|予約データなし|No order data
正常|正常|正常|Normal
超收|超收|超過入金|Overpaid
Firebase 版目前依訂單中的訂金、總額、確認狀態自動掃描；尚未接銀行流水匯入，因此不會自動改寫入帳資料。|Firebase 版按订单订金、总额和确认状态自动扫描；尚未接入银行流水，因此不会自动修改入账数据。|Firebase版は予約金・合計額・確認状態を照合します。銀行明細未連携のため入金データは自動変更しません。|Firebase scans deposits, totals and confirmation status. Bank statements are not connected, so receipt data is not changed automatically.
目前沒有需要人工處理的對帳異常。|当前没有需要人工处理的对账异常。|手動対応が必要な照合エラーはありません。|No reconciliation discrepancies need manual attention.
Firebase 自動對帳掃描|Firebase 自动对账扫描|Firebase自動照合スキャン|Firebase reconciliation scan
前往對帳分頁|前往对账页|照合タブへ|Go to reconciliation
掃描完成|扫描完成|スキャン完了|Scan complete
筆可自動配對|笔可自动匹配|件自動照合可能|records can be auto-matched
筆需人工確認|笔需人工确认|件手動確認が必要|records need manual review
筆找不到對應訂單|笔找不到对应订单|件の対応する予約なし|records have no matching order
會自動填入訂單號的銀行入帳（前 10 筆）：|将自动填写订单号的银行入账（前 10 笔）：|予約番号を自動入力する銀行入金（先頭10件）：|Bank receipts to receive order IDs automatically (first 10):
日期差|日期差|日付差|Date difference
多個候選（不會自動處理）|多个候选（不自动处理）|候補が複数（自動処理なし）|Multiple matches (not processed automatically)
自動配對預覽|自动匹配预览|自動照合プレビュー|Auto-match preview
套用|应用|適用|Apply
筆配對|笔匹配|件の照合|matches
這筆訂單被標為「異常」，原因：|此订单标记为“异常”，原因：|この予約は「要確認」です。理由：|This order is flagged for review because:
建議處理方式：依上方 tab「訂單資訊 / 退款記錄」修正後按「儲存變更」。|建议处理方式：在上方“订单信息 / 退款记录”修正后点击“保存更改”。|上の「予約情報／返金履歴」で修正し、「変更を保存」を押してください。|Correct the Order details / Refund history tabs above, then save changes.
已自訂|已自定义|カスタマイズ済み|Customized
套用模板|应用模板|テンプレートを適用|Apply template
全部回到預設|全部恢复默认|すべて既定値に戻す|Reset all to defaults
給客服月度關帳權限|授予客服月度关账权限|サポートに月次締め権限を付与|Grant support monthly closing access
給客服全部後台權限|授予客服全部后台权限|サポートに全管理権限を付与|Grant support full admin access
給店家看訂單管理|允许门店查看订单管理|店舗に予約管理の閲覧を許可|Allow stores to view order management
儲存所有變更|保存所有更改|すべての変更を保存|Save all changes
取消未存|取消未保存更改|未保存の変更を破棄|Discard unsaved changes
能做什麼|可执行的操作|できること|Capabilities
尚無自訂權限|尚无自定义权限|カスタム権限なし|No custom permissions
目前角色|当前角色|現在の役割|Current role
不可新增/授權其他角色|不可新增/授权其他角色|他の役割を追加・付与できません|Cannot add or authorize other roles
角色添加權限|角色添加权限|役割追加の権限|Role creation permissions
誰可以新增哪些 Firebase 後台角色，由後端強制校驗|后端强制校验各角色可新增的 Firebase 后台角色|追加可能なFirebase管理役割はサーバー側で検証されます|The backend enforces which Firebase admin roles each role can create
去員工管理新增|前往员工管理新增|スタッフ管理で追加|Add in Employees
你目前可以添加|你当前可以添加|現在追加できる役割|You can currently add
目前角色沒有新增/授權其他角色的權限。|当前角色无权新增/授权其他角色。|現在の役割には他の役割を追加・付与する権限がありません。|Your role cannot add or authorize other roles.
店長新增的帳號會自動綁定自己的店鋪，不能跨店建立或管理。|店长新增的账号自动绑定自己的店铺，不能跨店创建或管理。|店長が作成したアカウントは自店舗に固定され、他店舗は管理できません。|Accounts created by store managers are limited to their own store.
授權者角色|授权者角色|付与者の役割|Granting role
可以添加的角色|可添加的角色|追加可能な役割|Roles that can be added
我能做什麼|我可以做什么|自分ができること|My capabilities
每組預約 NT$440（到店折抵 ¥2,000）|每组预约 NT$440（到店抵扣 ¥2,000）|1組の予約につきNT$440（来店時に¥2,000充当）|NT$440 per booking (¥2,000 credited on arrival)
客人實際匯款金額|客人实际汇款金额|お客様の実際の振込額|Amount actually transferred by customer
已確認，金額正確|已确认，金额正确|確認済み・金額一致|Confirmed, amount matches
已收 < 應收訂金（店家現場補齊即可，非異常）|已收 < 应收订金（门店现场补齐即可，非异常）|受領額 < 予約金請求額（店舗で差額精算、異常ではありません）|Received < deposit due (collect the difference on site; not an anomaly)
已收 > 體驗總額（必須退款給客人）|已收 > 体验总额（必须退款给客人）|受領額 > 体験料金合計（お客様への返金が必要）|Received > experience total (refund required)
訂單尚未確認|订单尚未确认|予約は未確認です|Order not yet confirmed
walk-in 訂單因現場全額收款，deposit=0 但已確認也算「已對帳」。|walk-in 订单现场全额收款，deposit=0 且已确认也计为“已对账”。|当日来店予約は現地全額払いのため、deposit=0でも確認済みなら「照合済み」です。|Walk-in orders paid in full on site count as reconciled when confirmed, even with deposit=0.
舊 GAS 歸檔資料目前保留為只讀備份|旧 GAS 归档数据保留为只读备份|旧GASアーカイブは読み取り専用バックアップです|Legacy GAS archives are retained as read-only backups
Firebase 後台不再使用舊 GAS token，因此不直接讀取舊歸檔表。|Firebase 后台不再使用旧 GAS token，因此不直接读取旧归档表。|Firebase管理画面は旧GASトークンを使用しないため、旧アーカイブを直接読み込みません。|Firebase no longer uses legacy GAS tokens and does not directly read old archive sheets.
如需查歷史歸檔，請到舊 Google Sheet / GAS 備份資料查看。|如需历史归档，请查看旧 Google Sheet / GAS 备份数据。|過去のアーカイブは旧Google Sheet／GASバックアップで確認してください。|View historical archives in the old Google Sheet / GAS backups.
新 Firestore 資料請使用每日 Firestore export 備份策略。|新 Firestore 数据请使用每日 Firestore export 备份策略。|新しいFirestoreデータは毎日のFirestore exportでバックアップしてください。|Use daily Firestore exports to back up new Firestore data.
尚未關帳任何月份|尚未对任何月份关账|締め済みの月はありません|No closed months yet
關帳於|关账于|締め日時|Closed at
已歸檔|已归档|アーカイブ済み|Archived
沒有符合的結果|没有符合的结果|一致する結果なし|No matching results
找到|找到|検索結果|Found
天氣資料載入失敗|天气数据载入失败|天気データを読み込めません|Could not load weather
無天氣資料|无天气数据|天気データなし|No weather data
地點|地点|場所|Location
末3碼|末3位|下3桁|Last 3 digits
加值|增值服务|オプション|Add-ons
自助|自助|セルフ|Self-service
代客|代客|スタッフ代行|Staff-assisted
尚無 walk-in 訂單|尚无 walk-in 订单|当日来店予約はありません|No walk-in orders yet
和服總額|和服总额|着物料金合計|Total kimono fees
客付總額|客付总额|お客様支払合計|Total customer payments
應收店家|应收门店|店舗への請求額|Due from store
私人|私人|個人|Private
本月無 walk-in 訂單|本月无 walk-in 订单|今月の当日来店予約はありません|No walk-in orders this month
折扣|折扣|割引|Discount
客付|客付|お客様支払|Customer payment
請款對象|请款对象|請求先|Bill to
請款月份|请款月份|請求月|Billing month
開立日期|开立日期|発行日|Issue date
本期筆數|本期笔数|当期件数|Count this period
應付楽禾|应付楽禾|楽禾への支払額|Due to Lèhé
僅和服抽成|仅和服提成|着物代のみ手数料|Kimono commission only
合計應付楽禾|合计应付楽禾|楽禾への支払合計|Total due to Lèhé
拆帳項目僅限「和服費」|分账项目仅限“和服费”|分配対象は「着物代」のみ|Revenue sharing applies only to kimono fees
，妝髮費與攝影費 100% 由店家保留，楽禾不抽取。|，妆发费与摄影费全部由门店保留，楽禾不提成。|。ヘアメイク・撮影代は全額店舗に帰属します。|; stores retain all styling and photography fees.
和服費拆帳：無折活動店家 50%／楽禾 50%；有折扣活動店家固定 50%、折扣由楽禾吸收（楽禾實拿 = 和服原價 × 折數/10 − 和服原價 × 50%）。|和服费分账：无折扣门店 50%／楽禾 50%；有折扣门店固定 50%、楽禾承担折扣（楽禾实得 = 和服原价 × 折数/10 − 和服原价 × 50%）。|着物代の分配：通常は店舗50%／楽禾50%。割引時も店舗50%は固定で、割引は楽禾負担（楽禾受取＝定価×掛け率/10−定価×50%）。|Kimono revenue is split 50:50 at full price. With discounts, stores keep 50% of list price; Lèhé receives discounted kimono revenue minus that store share.
請於每月 5 日前匯款至下方楽禾指定帳戶|请于每月 5 日前汇款至下方楽禾指定账户|毎月5日までに下記の楽禾指定口座へお振り込みください|Transfer to the Lèhé account below by the 5th of each month
店家負責人簽章|门店负责人签章|店舗責任者の署名・印鑑|Store manager signature / stamp
店家用印|门店盖章|店舗印|Store stamp
楽禾用印|楽禾盖章|楽禾印|Lèhé stamp
列印 / Save PDF|打印 / 保存 PDF|印刷 / PDF保存|Print / Save PDF
錯誤|错误|エラー|Error
尚無 Firebase 後台使用者|尚无 Firebase 后台用户|Firebase管理ユーザーはまだいません|No Firebase admin users yet
最後登入|最后登录|最終ログイン|Last sign-in
Firebase 使用者載入失敗|Firebase 用户载入失败|Firebaseユーザーを読み込めません|Could not load Firebase users
尚無員工，點上方「+ 新增員工」開始|尚无员工，点击上方“+ 新增员工”开始|スタッフはまだいません。上の「+ スタッフを追加」から開始してください|No employees yet. Click “+ Add employee” above to start
員工 ID|员工 ID|スタッフID|Employee ID
已約|已预约|予約済み|Booked
`.trim().split('\n').map(line => { const [key, ...values] = line.split('|'); return [key, values]; })));
Object.assign(window.ADMIN_I18N_CATALOG, Object.fromEntries(`
客服後台 — 旅乘 x 和服|客服后台 — 旅乘 x 和服|管理画面 — Foreveryoung 着物|Admin Portal — Foreveryoung Kimono
旅乘訂單|旅乘订单|Foreveryoung の予約|Foreveryoung orders
樂禾訂單|乐禾订单|樂禾の予約|Lèhé orders
只看旅乘|只看旅乘|Foreveryoung のみ|Foreveryoung only
只看樂禾|只看乐禾|樂禾のみ|Lèhé only
匯出表格|导出表格|表を出力|Export table
匯出選取表格|导出选中表格|選択行を出力|Export selected rows
體驗日期 ↓（同日早到晚）|体验日期 ↓（同日按时间升序）|体験日 ↓（同日は時間順）|Visit date ↓ (earliest time first within each day)
旅乘只與店家分配「和服費」收益（無折 5:5；有折扣由旅乘吸收）。|旅乘仅与门店分配“和服费”收益（无折扣 5:5；折扣由旅乘承担）。|Foreveryoungと店舗は着物代のみを分配します（通常5:5、割引はForeveryoung負担）。|Foreveryoung shares only kimono revenue with stores (50:50 at full price; Foreveryoung covers discounts).
，旅乘不抽取任何金額。|，旅乘不收取任何金额。|。Foreveryoungの手数料はありません。|; Foreveryoung takes no commission on these fees.
訂單詳情|订单详情|予約詳細|Order details
折扣码|折扣码|割引コード|Discount code
优惠金额|优惠金额|割引額|Coupon discount
超時與污損扣款|超时与污损扣款|延滞・汚損控除額|Late / damage deduction
預約頁下拉選項|预约页下拉选项|予約ページの選択肢|Booking page options
每組可新增多個條目；顯示文字會出現在客人預約頁，金額會計入訂單。文字以「不需要」開頭會自動視為不需要項。|每组可新增多项；文字显示在客人预约页，金额计入订单。以“不需要”开头的文字自动视为无需服务选项。|各グループに複数項目を追加できます。表示文は予約ページに掲載され、金額は予約に加算されます。「不需要」で始まる項目は不要として扱います。|Add multiple options per group. Labels appear on the booking page and prices are added to orders. Labels beginning with “不需要” are treated as no-service options.
顯示文字|显示文字|表示テキスト|Display label
攝影方案|摄影方案|撮影プラン|Photography plan
預設無折＝ 5:5 拆帳；有折扣時店家固定拿 50%，旅乘吸收折扣|默认无折扣＝5:5 分账；有折扣时门店固定拿 50%，旅乘承担折扣|通常は5:5で分配。割引時も店舗は定価の50%を受け取り、Foreveryoungが割引を負担します|Default split is 50:50. With discounts, stores keep 50% of list price and Foreveryoung covers the discount.
刪除選項|删除选项|選択肢を削除|Delete option
至少需要 1 個選項。|至少需要 1 个选项。|選択肢が1つ以上必要です。|At least one option is required.
行缺少顯示文字。|行缺少显示文字。|行目の表示テキストが未入力です。|row is missing a display label.
」重複。|”重复。|」が重複しています。|” is duplicated.
髮型|发型|ヘアセット|Hair styling
正在重新整理後台|正在刷新后台|管理画面を更新中|Refreshing admin portal
重新載入目前登入帳號與最新資料...|正在载入当前账号与最新数据...|現在のアカウントと最新データを再読込中…|Reloading your account and the latest data…
訊息|消息|メッセージ|Message
男性人數|男性人数|男性人数|Men
女性人數|女性人数|女性人数|Women
兒童人數|儿童人数|子どもの人数|Children
男|男|男性|Men
女|女|女性|Women
小|小|子ども|Children
大|成人|大人|Adults
組|组|組|groups
人|人|名|guests
天|天|日|days
月|月|月|month
年|年|年|year
折|折|掛け率|Price multiplier
訪|次|回来店|visits
剩|剩余|残り|Remaining
`.trim().split('\n').map(line => { const [key, ...values] = line.split('|'); return [key, values]; })));
Object.assign(window.ADMIN_I18N_CATALOG, Object.fromEntries(`
旅乘 x 和服|旅乘 x 和服|Foreveryoung 着物|Foreveryoung Kimono
旅乘 + 樂禾|旅乘 + 乐禾|Foreveryoung + Lèhé|Foreveryoung + Lèhé
整月|整月|月全体|Whole month
共|共|合計|Total
單|单|件|orders
末|末|下桁|Last digits
應付旅乘|应付旅乘|Foreveryoungへの支払額|Due to Foreveryoung
合計應付旅乘|合计应付旅乘|Foreveryoungへの支払合計|Total due to Foreveryoung
，妝髮費與攝影費 100% 由店家保留，旅乘不抽取。|，妆发费与摄影费全部由门店保留，旅乘不提成。|。ヘアメイク・撮影代は全額店舗に帰属します。|; stores retain all styling and photography fees.
和服費拆帳：無折活動店家 50%／旅乘 50%；有折扣活動店家固定 50%、折扣由旅乘吸收（旅乘實拿 = 和服原價 × 折數/10 − 和服原價 × 50%）。|和服费分账：无折扣门店 50%／旅乘 50%；有折扣门店固定 50%、旅乘承担折扣（旅乘实得 = 和服原价 × 折数/10 − 和服原价 × 50%）。|着物代の分配：通常は店舗50%／Foreveryoung50%。割引時も店舗50%は固定で、割引はForeveryoung負担（受取額＝定価×掛け率/10−定価×50%）。|Kimono revenue is split 50:50 at full price. With discounts, stores keep 50% of list price; Foreveryoung receives discounted revenue minus that store share.
請於每月 5 日前匯款至下方旅乘指定帳戶|请于每月 5 日前汇款至下方旅乘指定账户|毎月5日までに下記のForeveryoung指定口座へお振り込みください|Transfer to the Foreveryoung account below by the 5th of each month
旅乘確認|旅乘确认|Foreveryoung確認|Foreveryoung confirmation
旅乘用印|旅乘盖章|Foreveryoung印|Foreveryoung stamp
學習進度|学习进度|学習の進捗|Learning progress
全部看完了！|全部学完了！|すべて完了しました！|All lessons completed!
您的角色目前沒有可用的訓練場景|你的角色当前没有可用培训场景|現在の役割に利用可能なトレーニングはありません|No training scenarios are available for your role
已看完|已学完|学習済み|Completed
新預約進來|收到新预约|新しい予約|New bookings
客人要退款|客人申请退款|返金の依頼|Refund requests
客人到店報到|客人到店报到|お客様の来店受付|Customer check-in
Walk-in 現場開單|Walk-in 现场开单|当日来店の予約作成|Walk-in orders
儀表板總覽|仪表盘总览|ダッシュボード概要|Dashboard overview
行事曆視圖|日历视图|カレンダー表示|Calendar view
登入與帳號管理|登录与账号管理|ログインとアカウント管理|Sign-in and account management
介面全覽 - 9 個 tab|界面概览 - 9 个标签页|画面概要：9つのタブ|Interface overview: 9 tabs
訂單生命週期 + 狀態變化|订单生命周期与状态变化|予約のライフサイクルと状態|Order lifecycle and status changes
上班第一件事|上班第一件事|始業時の作業|Starting your shift
月底關帳完整流程|月底关账完整流程|月末締めの手順|Month-end closing workflow
連假浪潮應對|连假高峰应对|連休の混雑対応|Holiday peak handling
門市交接班 + 下班關機|门店交接班与下班关机|店舗の引継ぎと終業|Shift handoff and closing
客人要改期|客人申请改期|予約日変更の依頼|Rescheduling requests
客人到門口但找不到訂單|客人到店但找不到订单|来店したお客様の予約が見つからない|Customer arrives but order is missing
客訴處理 SOP|客诉处理 SOP|苦情対応の手順|Complaint handling
退款轉錯帳戶 / 金額|退款转错账户 / 金额|返金先・金額の間違い|Incorrect refund account / amount
折扣碼新增 / 修改|折扣码新增 / 修改|割引コードの追加・編集|Add / edit discount codes
新增 / 刪除員工帳號|新增 / 删除员工账号|スタッフアカウントの追加・削除|Add / remove employee accounts
店家請款單 + 匯款流程|门店请款单与汇款流程|店舗請求書と振込フロー|Store invoices and transfers
客人 inquiry 填表 → admin 待確認 → 檢查 → 確認 → 自動寄信|客人填写查询页表单 → 后台待确认 → 检查 → 确认 → 自动发邮件|お客様入力 → 管理画面で確認待ち → 確認 → 承認 → 自動メール|Customer form → pending review → check → confirm → automatic email
客人 inquiry 申請退款 → admin 出現申請 → 按政策算 → 轉帳 → 標完成|客人申请退款 → 后台收到申请 → 按政策计算 → 转账 → 标记完成|返金申請 → 管理画面に表示 → 規定に沿って計算 → 振込 → 完了|Refund request → review → calculate under policy → transfer → mark complete
客人到店 → 自助 or 代客報到 → Sheet 寫 AL/AM/AN|客人到店 → 自助或代客报到 → Sheet 写入 AL/AM/AN|来店 → セルフまたは代理受付 → SheetのAL/AM/ANへ記録|Arrival → self or staff check-in → Sheet AL/AM/AN recorded
銀行入帳 → 找對應訂單 → 註記訂金 → 狀態變 matched|银行入账 → 查找对应订单 → 记录订金 → 状态变为 matched|銀行入金 → 予約を特定 → 予約金を記録 → matched|Bank receipt → find order → record deposit → matched
客人沒預約直接走進店 → ＋現場新增 → 結算 → 現場付清|客人未预约到店 → ＋现场新增 → 结算 → 现场付清|予約なしの来店 → 当日来店予約を追加 → 精算 → 現地支払|Walk-in arrival → add walk-in → calculate → pay on site
每天打開後台的第一站，看今日營運、快速跳轉|每天打开后台的第一站，查看今日运营并快速跳转|本日の運営状況を確認し、必要な画面へ移動|Start here each day to review operations and navigate quickly
月曆視角看所有體驗預約，點日期看當天訂單|按月历查看所有体验预约，点击日期查看当天订单|月別に予約を表示し、日付を押すと当日の予約を確認できます|View bookings by month; select a date to see its orders
看客人累計來店次數、判斷 VIP、看退款紀錄|查看累计来店次数、VIP 和退款记录|来店回数・VIP判定・返金履歴を確認|Review visit counts, VIP status and refund history
看每月收入、毛利、退款率、各分店分潤|查看每月收入、毛利、退款率和各店分润|月次収入・粗利・返金率・店舗別分配を確認|Review monthly revenue, gross profit, refunds and store shares
已關帳月份的訂單存檔（唯讀），需要查歷史時用|已关账月份的只读订单存档，用于历史查询|締め済み月の予約を読み取り専用で確認|Read-only order archives for historical lookups
看每個角色（Jun / agent / store）能做什麼、不能做什麼|查看各角色（Jun / agent / store）的权限范围|各役割（Jun / agent / store）の権限を確認|Review what each role (Jun / agent / store) can do
怎麼登入後台、密碼忘記怎麼辦、團隊帳號共用規則|如何登录后台、重设密码与团队账号规则|ログイン方法・パスワード再設定・チームアカウントのルール|Sign-in, forgotten passwords and team account rules
5 分鐘快速看一遍所有 tab 是什麼、我什麼時候會進|5 分钟了解各标签页及使用场景|5分で各タブの用途を確認|A five-minute overview of each tab and when to use it
一筆訂單從建立到結案的完整 7 個狀態與轉換規則|订单从创建到结案的 7 个状态及转换规则|予約作成から完了までの7つの状態と遷移|Seven order states and transitions from creation to closure
早上補班第一個小時 SOP - 25 分鐘把昨晚 + 今天事處理好|早班操作流程：25 分钟处理昨晚和今天的事项|朝の25分で昨夜と本日の対応事項を処理|A 25-minute morning routine for overnight and today's tasks
28-30 號要做什麼 → 31 號關帳 → 連結到店家月結|28–30 日准备 → 31 日关账 → 门店月结|28〜30日の準備 → 31日の締め → 店舗月次精算|Prepare on days 28–30 → close on day 31 → store settlement
連假/櫻花季客人暴增怎麼處理？預防客訴、確保品質|如何应对连假或樱花季客流高峰，预防投诉并确保质量|連休・桜シーズンの混雑対策と品質維持|Handle holiday / cherry blossom crowds while maintaining service quality
下班前最後一小時 SOP + 交接給下一班 / 隔天的注意事項|下班前一小时流程与下一班或次日交接事项|終業前1時間の作業と次のシフトへの引継ぎ|Final-hour checklist and handoff to the next shift / day
不是退款，是換體驗日期 - 怎麼操作、是否收手續費|修改体验日期的操作和手续费规则|体験日の変更方法と手数料の確認|How to change visit dates and check applicable fees
排查步驟：訂單號錯 / Email 拼錯 / 跑錯店 / 已關帳？|排查订单号、Email、门店和历史归档|予約番号・メール・店舗・締め済み月を確認|Check order ID, email, store and archives
客人不滿意服務 / 品質怎麼處理 - 語氣、權限邊界、何時抓 Jun|处理服务或质量投诉：沟通、权限边界和何时联系 Jun|サービスの苦情対応：話し方・権限・Junへの連絡時点|Handle service complaints: communication, authority and escalation to Jun
人為失誤怎麼補救、怎麼避免下次再犯|如何补救人为失误并避免再次发生|人為的ミスの対応と再発防止|Correct human errors and prevent recurrence
怎麼建新折扣碼、設定有效期 / 限定門市|如何新增折扣码、设置有效期和适用门店|割引コード・有効期間・対象店舗の設定|Create discount codes, validity periods and store restrictions
agent 新人進來怎麼建帳號 / 離職怎麼撤帳號|客服入职创建账号与离职撤销账号|サポート入社時のアカウント作成と退職時の削除|Create accounts for new staff and revoke access when they leave
月底生請款單給店家、追店家匯款、處理差異|月底生成请款单、跟进门店汇款并处理差异|月末の店舗請求書作成・入金確認・差額処理|Create month-end invoices, follow up transfers and resolve discrepancies
Jun 限定 tab，查誰在何時改了什麼（責任 / 補救 / 審計）|Jun 专用页，查看谁在何时修改了什么|Jun専用。誰がいつ何を変更したか確認|Jun-only tab showing who changed what and when
歡迎使用楽禾後台|欢迎使用楽禾后台|楽禾管理画面へようこそ|Welcome to the Lèhé admin portal
歡迎使用旅乘後台|欢迎使用旅乘后台|Foreveryoung管理画面へようこそ|Welcome to the Foreveryoung admin portal
快速導覽帶您認識 4 個主要功能。約 2-3 分鐘。隨時可按右上角「?」重看。|快速导览介绍 4 个主要功能，约 2–3 分钟。可随时点击右上角“?”重看。|2〜3分で4つの主な機能をご案内します。右上の「?」でいつでも再表示できます。|This 2–3 minute tour covers four main features. Reopen it anytime with “?” at the top right.
所有訂單在這裡列出。最常用的功能，每天都會看。|所有订单在这里列出，这是每日最常用的功能。|すべての予約を表示します。毎日使う主な機能です。|All orders are listed here. This is the main daily workspace.
快速狀態 tab|快捷状态标签|状態のクイック切替|Quick status tabs
上面的 tab 可以快速切換：今天 / 待確認 / 已確認 / 退款 / 異常。點一下就只看那個狀態的訂單。|上方标签可切换今天、待确认、已确认、退款和异常，点击即可筛选。|上のタブで本日・確認待ち・確認済み・返金・要確認の予約を絞り込めます。|Use the tabs above to filter today's orders, pending review, confirmed orders, refunds and anomalies.
展開「進階搜尋」可以用姓名、電話、訂單號、Email 找特定客人，也能用日期區間篩選。|展开“高级搜索”，可按姓名、电话、订单号、Email 或日期区间筛选。|詳細検索で氏名・電話・予約番号・メール・日付範囲から検索できます。|Expand Advanced search to find guests by name, phone, order ID, email or date range.
訂單卡|订单卡片|予約カード|Order cards
每張卡片顯示客人姓名、訂單號、體驗日期、人數、和服款式。已確認 + 體驗日 ±1 天會看到 🎌 報到按鈕。|卡片显示姓名、订单号、体验日期、人数和款式。已确认且在体验日前后一天内显示报到按钮。|氏名・予約番号・体験日・人数・着物を表示。確認済みで体験日前後1日以内の予約には受付ボタンが表示されます。|Cards show the guest, order ID, visit date, guests and kimono style. Confirmed orders within one day of the visit show a check-in button.
報到中心|报到中心|来店受付センター|Check-in center
新功能！今日 ±1 天的訂單看板，客人到店時用這裡最快。|查看今天前后一天的订单，客人到店时可快速操作。|本日前後1日の予約を表示します。来店時の受付に便利です。|A board of orders within one day of today for quick arrivals.
當日報到統計|当日报到统计|本日の受付状況|Today's check-in statistics
三個格子：⏳ 待報到、🎌 客人自助、✅ 已代客報到。一眼看出今天進度。|三个区域：待报到、客人自助、已代客报到，快速查看今日进度。|受付待ち・お客様セルフ・スタッフ代理受付の3区分で進捗を確認できます。|Three counters show awaiting check-in, customer self check-in and staff check-in.
末碼搜尋|末位号码搜索|電話番号の下桁で検索|Search phone suffix
客人說「我手機末3碼是 999」→ 直接打 999，看板會即時 filter 到那筆訂單。比翻訂單列表快很多。|输入客人手机末三位，例如 999，即可即时筛选订单。|電話番号の下3桁（例：999）を入力すると予約をすぐに絞り込めます。|Enter the last three phone digits, such as 999, to filter the board immediately.
訂單卡片 + 報到按鈕|订单卡片与报到按钮|予約カードと受付ボタン|Order cards and check-in buttons
每張卡片有客人姓名、訂單號、體驗時間、末3碼。確認客人身份後點「🎌 為客人報到」就完成。已報到的卡片按鈕會變灰。|卡片包含姓名、订单号、时间和手机末三位。核对身份后点击“为客人报到”，完成后按钮变灰。|氏名・予約番号・体験時間・下3桁を確認し、「お客様を受付」を押します。受付済みのボタンは無効になります。|Verify the guest's name, order ID, visit time and phone suffix, then click Check in customer. Completed buttons become disabled.
對帳是檢查每筆訂單收款狀況。月底結帳前要清完所有狀態。|对账用于检查每笔订单收款情况，月底结账前应完成处理。|各予約の入金状況を確認します。月末締め前にすべて処理してください。|Reconciliation checks each order's receipts. Resolve outstanding items before month-end closing.
預設顯示本月，可以下拉切到上個月看歷史對帳記錄。|默认显示本月，可通过下拉框查看上月记录。|既定で今月を表示します。プルダウンで過去の月を選択できます。|Defaults to this month. Use the dropdown to view prior months.
🟢 已對帳 (收款金額正確)、🟡 部分收款 (待補尾款)、🔴 超收 (要退費)、⚪ 待對帳。可以下拉只看其中一種狀態。|🟢 已对账、🟡 部分收款、🔴 超收、⚪ 待对账，可按状态筛选。|🟢 照合済み、🟡 一部入金、🔴 超過入金、⚪ 照合待ち。状態で絞り込めます。|🟢 Reconciled, 🟡 partially paid, 🔴 overpaid, ⚪ awaiting reconciliation. Filter by status.
Walk-in 客人專用月結頁。每月底用這裡跟我們對帳。|Walk-in 客人专用月结页，用于每月底对账。|当日来店予約専用の月次精算ページです。月末の照合に使用します。|Monthly settlement for walk-in orders. Use it for month-end reconciliation.
選月份|选择月份|月を選択|Select month
選要結算的月份，下面會列出該月所有 walk-in 訂單，自動算總收入、店家收的、我們應收的。|选择结算月份，下方显示全部 walk-in 订单并计算收入和分账。|精算月を選択すると、当日来店予約と収入・店舗取り分・請求額を表示します。|Select a month to list walk-in orders and calculate total revenue, store share and amount due.
各店家請款卡片|各门店请款卡片|店舗別請求カード|Store invoice cards
依門市分類顯示當月 walk-in 收入。每張卡片右上「📄 請款單」可下載該店家的明細請款單給會計。|按门店显示当月 walk-in 收入，点击卡片右上“请款单”下载明细。|店舗別の当日来店収入を表示します。カード右上の「請求書」から明細をダウンロードできます。|Cards group monthly walk-in revenue by store. Use Invoice at the top right to download the detailed bill.
教學完成！|教学完成！|ガイド完了！|Tour complete!
隨時可以點右上角的「?」重看。如果有任何使用問題或建議，請聯絡 Jun。|可随时点击右上角“?”重看。如有问题或建议，请联系 Jun。|右上の「?」で再表示できます。ご質問やご提案はJunへご連絡ください。|Reopen with “?” at the top right. Contact Jun with questions or suggestions.
您好！店家後台快速導覽|你好！门店后台快速导览|店舗管理画面のクイックガイド|Welcome! Store portal quick tour
5 個步驟帶您看店家每天會用到的功能。約 1 分鐘。隨時可按右上「?」重看。|5 个步骤介绍每日功能，约 1 分钟。可点击右上角“?”重看。|約1分・5ステップで毎日の機能をご案内します。「?」で再表示できます。|Five steps cover daily store tasks in about a minute. Reopen with “?” anytime.
最常用|最常用|よく使う機能|Most used
客人到店 → 直接點這個 tab。看今天 ±1 天所有預約，按時間排好。|客人到店时点击此标签，查看今天前后一天按时间排列的预约。|来店時はこのタブを開きます。本日前後1日の予約を時間順に表示します。|Open this tab when guests arrive to see bookings within one day of today, sorted by time.
末碼搜尋（超好用）|末位号码搜索|電話番号の下桁検索|Phone suffix search
客人說「我手機末3碼是 999」→ 打 999 → 那筆訂單即時跳出來。比翻訂單列表快太多。|输入客人手机末三位，例如 999，即可立即找到对应订单。|電話番号の下3桁（例：999）で予約をすぐに検索できます。|Type the last three phone digits, such as 999, to find the order instantly.
幫客人報到|为客人报到|お客様の受付|Check in a guest
找到客人那張卡 → 點下方「🎌 為客人報到」按鈕 → 完成。已報到的卡片變綠色，按鈕變灰防重複點。|找到订单卡片并点击“为客人报到”。完成后卡片变绿，按钮禁用以防重复。|予約カードの「お客様を受付」を押します。完了後は緑色になり、重複操作を防ぐためボタンが無効になります。|Find the guest's card and click Check in customer. The card turns green and the button is disabled to prevent duplicates.
右下角藍色「＋ 現場新增」按鈕：客人沒預約直接走進店裡 → 點這個現場開單收錢。|未预约的客人到店时，点击右下角“＋现场新增”创建订单并收款。|予約なしで来店された場合は、右下の「＋当日来店予約を追加」で予約を作成します。|For walk-in guests, use “+ Add walk-in” at the bottom right to create an order and collect payment.
月底跟楽禾對帳用。看本月所有 walk-in 訂單、總收入。點卡片右上「📄 請款單」可下載明細給會計。|月底与楽禾对账，查看本月 walk-in 订单及收入，点击“请款单”下载明细。|楽禾との月末精算に使用します。当日来店予約と収入を確認し、「請求書」で明細を取得できます。|Use for month-end reconciliation with Lèhé. Review walk-in orders and revenue, then download Invoice details for accounting.
月底跟旅乘對帳用。看本月所有 walk-in 訂單、總收入。點卡片右上「📄 請款單」可下載明細給會計。|月底与旅乘对账，查看本月 walk-in 订单及收入，点击“请款单”下载明细。|Foreveryoungとの月末精算に使用します。当日来店予約と収入を確認し、「請求書」で明細を取得できます。|Use for month-end reconciliation with Foreveryoung. Review walk-in orders and revenue, then download Invoice details for accounting.
隨時可以點右上角的「?」重看。有任何問題請聯絡客服 Jun。|可随时点击右上角“?”重看。如有问题，请联系 Jun。|右上の「?」で再表示できます。ご質問はサポートのJunへ。|Reopen with “?” at the top right. Contact Jun for help.
`.trim().split('\n').map(line => { const [key, ...values] = line.split('|'); return [key, values]; })));
Object.assign(window.ADMIN_I18N_CATALOG, {
  '訂單列印表': ['订单打印表', '予約印刷表', 'Order printout'],
  '預約時間': ['预约时间', '予約日時', 'Booking time'],
  '平台備註': ['平台备注', 'プラットフォームメモ', 'Platform notes'],
  '和服價格': ['和服价格', '着物料金', 'Kimono price'],
  '楽禾確認': ['楽禾确认', '楽禾確認', 'Lèhé confirmation']
});
