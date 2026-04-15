# Context thu vien theo tinh nang - RushCord Mobile

Tai lieu nay tong hop cac thu vien mobile dang duoc dung thuc te trong source code `RushCord_Mobile`, kem vai tro cua tung thu vien theo tung tinh nang de co the giai thich voi giang vien.

## 1. Tong quan cong nghe

- Nen tang: `React Native` + `Expo`
- Dieu huong: `expo-router`
- Goi API REST: `axios`
- Luu token an toan: `expo-secure-store`
- Quan ly state toan cuc: `zustand`
- Realtime chat/presence: `socket.io-client`
- Chon anh/video: `expo-image-picker`
- Xem video trong khung chat: `expo-av`
- Mo file/preview tai lieu: `expo-web-browser`
- Icon: `@expo/vector-icons`
- Xu ly safe area va gesture: `react-native-safe-area-context`, `react-native-gesture-handler`

## 2. Thu vien theo tung tinh nang

### 2.1 Dieu huong va cau truc man hinh

**Thu vien dung:**
- `expo-router`
- `react-native-safe-area-context`
- `react-native-gesture-handler`
- `expo-splash-screen`
- `expo-status-bar`

**Muc dich:**
- `expo-router`: to chuc man hinh theo folder `app/`, tu dong tao route cho login, register, tabs, chat detail.
- `react-native-safe-area-context`: tranh de UI bi che boi notch, status bar, home indicator.
- `react-native-gesture-handler`: ho tro gesture/touch on dinh cho app React Native.
- `expo-splash-screen`: giu splash screen cho den khi app kiem tra xong trang thai dang nhap.
- `expo-status-bar`: cau hinh mau/status style cua thanh trang thai.

**File tieu bieu:**
- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `app/index.tsx`

**Cach giai thich ngan:**
> Em dung `expo-router` de quan ly flow man hinh theo cau truc thu muc, con `safe-area`, `gesture-handler`, `splash-screen` giup trai nghiem mobile on dinh va dung chuan giao dien native.

### 2.2 Xac thuc nguoi dung

**Tinh nang:**
- Dang ky
- Xac nhan email OTP
- Dang nhap
- Kiem tra phien dang nhap
- Dang xuat
- Tu dong refresh token

**Thu vien dung:**
- `axios`
- `expo-secure-store`
- `zustand`
- `expo-router`

**Muc dich:**
- `axios`: goi API `/auth/register`, `/auth/confirm`, `/auth/login`, `/auth/check`, `/auth/logout`, `/auth/refresh`.
- `expo-secure-store`: luu `accessToken` va `refreshToken` an toan tren thiet bi.
- `zustand`: luu `authUser`, trang thai loading, danh sach user online, call state.
- `expo-router`: dieu huong sau khi dang nhap/dang ky/xac thuc xong.

**File tieu bieu:**
- `store/authStore.ts`
- `services/api.ts`
- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`
- `app/(auth)/confirm.tsx`

**Diem hay de noi voi giang vien:**
- Token khong luu bang bien tam, ma luu bang `expo-secure-store` de an toan hon.
- `axios interceptor` duoc dung de gan token vao moi request va tu dong refresh token khi het han.
- `zustand` giup tach logic auth ra khoi UI, man hinh chi goi action va render state.

### 2.3 Chat realtime va online status

**Tinh nang:**
- Ket noi realtime sau khi dang nhap
- Nhan tin nhan moi ngay lap tuc
- Hien thi user online/offline
- Cap nhat conversation gan day
- Thu hoi tin nhan
- Banner thong bao tin nhan moi trong app

**Thu vien dung:**
- `socket.io-client`
- `zustand`
- `axios`

**Muc dich:**
- `socket.io-client`: ket noi socket den backend, nghe cac event nhu `newMessage`, `getOnlineUsers`, `messageRecalled`, `incomingCall`, `hangup`.
- `zustand`: giu `messages`, `recentConversations`, `selectedUser`, `onlineUsers`.
- `axios`: tai lich su tin nhan, danh sach user, recent conversations bang REST API.

**File tieu bieu:**
- `services/socket.ts`
- `store/chatStore.ts`
- `store/authStore.ts`
- `components/ui/NewMessageBanner.tsx`
- `app/(tabs)/index.tsx`
- `app/chat/[id].tsx`

**Cach giai thich ngan:**
> Phan chat dung ket hop REST va Socket. REST dung de load du lieu ban dau, con Socket dung de nhan cap nhat realtime nhu tin nhan moi va trang thai online.

### 2.4 Gui tin nhan kem anh, video, file

**Tinh nang:**
- Chon anh/video tu thu vien
- Upload file len backend qua presigned URL
- Gui text, 1 file hoac nhieu anh
- Xem anh/video ngay trong man hinh chat
- Preview tai lieu PDF/DOC/DOCX

**Thu vien dung:**
- `expo-image-picker`
- `expo-av`
- `expo-web-browser`
- `axios`
- `fetch` co san trong React Native

**Muc dich:**
- `expo-image-picker`: cho nguoi dung chon anh/video tu may.
- `expo-av`: phat video ngay trong bubble chat.
- `expo-web-browser`: mo trinh xem tai lieu khi nguoi dung bam vao file.
- `axios`: gui metadata message len backend sau khi upload xong.
- `fetch`: upload binary truc tiep len `uploadUrl` do backend cap.

**File tieu bieu:**
- `app/chat/[id].tsx`
- `services/upload.ts`
- `store/chatStore.ts`

**Diem hay de noi voi giang vien:**
- App khong upload file thang vao API message.
- App xin backend mot `presigned-upload URL`, sau do upload truc tiep file len storage.
- Sau khi upload xong moi gui `publicUrl`, `key`, `mimeType`, `fileName` vao API message.
- Cach nay giam tai cho backend va phu hop kien truc cloud.

### 2.5 Ho so ca nhan va avatar

**Tinh nang:**
- Hien thi thong tin nguoi dung
- Doi avatar tu thu vien anh
- Cap nhat profile len backend

**Thu vien dung:**
- `expo-image-picker`
- `axios`
- `zustand`

**Muc dich:**
- `expo-image-picker`: chon avatar moi.
- `axios`: goi API cap nhat profile.
- `zustand`: dong bo lai `authUser` sau khi update.

**File tieu bieu:**
- `app/(tabs)/profile.tsx`
- `services/upload.ts`
- `store/authStore.ts`
- `components/ui/Avatar.tsx`

### 2.6 Giao dien, icon va trai nghiem mobile

**Thu vien dung:**
- `@expo/vector-icons`
- `react-native-safe-area-context`
- `expo-status-bar`

**Muc dich:**
- `@expo/vector-icons`: icon cho tab bar, nut gui, nut media, file attachment.
- `react-native-safe-area-context`: can le UI dung tren cac may co notch.
- `expo-status-bar`: dong bo mau/status style voi giao dien toi.

**File tieu bieu:**
- `app/(tabs)/_layout.tsx`
- `app/chat/[id].tsx`
- `app/_layout.tsx`

## 3. Bang tom tat nhanh

| Tinh nang | Thu vien chinh | Vai tro |
| --- | --- | --- |
| Dieu huong man hinh | `expo-router` | Quan ly route theo folder va chuyen man hinh |
| Dang nhap/dang ky | `axios`, `expo-secure-store`, `zustand` | Goi API, luu token, quan ly auth state |
| Refresh token | `axios`, `expo-secure-store` | Interceptor tu dong xin token moi |
| Chat realtime | `socket.io-client`, `zustand` | Nhan tin nhan moi, online status, recall |
| Danh sach hoi thoai | `axios`, `zustand` | Load recent conversations va user list |
| Gui anh/video/file | `expo-image-picker`, `fetch`, `axios` | Chon file, upload presigned URL, gui metadata |
| Xem video | `expo-av` | Render video ngay trong khung chat |
| Preview tai lieu | `expo-web-browser` | Mo PDF/DOC/DOCX de xem |
| Avatar/profile | `expo-image-picker`, `axios`, `zustand` | Chon avatar va cap nhat profile |
| Icon/UI mobile | `@expo/vector-icons`, `safe-area-context` | Icon, can le giao dien, trai nghiem native |

## 4. Thu vien da cai nhung chua thay dung truc tiep trong source hien tai

Duoi day la mot so dependency co trong `package.json` nhung hien tai chua thay import truc tiep trong code app:

- `@react-native-async-storage/async-storage`
- `expo-asset`
- `expo-constants`
- `expo-font`
- `expo-linking`
- `expo-modules-core`
- `react-native-reanimated`
- `react-native-screens`
- `react-native-worklets`

**Luu y:**
- Mot so thu vien trong danh sach tren co the la dependency ho tro cho Expo/React Native runtime.
- Nghia la van can cho he thong chay on dinh, nhung source app hien tai chua goi truc tiep den.

## 5. Cach trinh bay ngan gon voi giang vien

Neu can noi ngan trong 1-2 phut, co the trinh bay theo mau sau:

1. Mobile app cua em duoc viet bang `React Native` va `Expo` de lam app da nen tang nhanh.
2. Em dung `expo-router` de quan ly man hinh theo cau truc thu muc, rat hop voi app co login, tab va chat detail.
3. Em dung `axios` de giao tiep voi backend REST API, va dung `expo-secure-store` de luu token an toan.
4. Em dung `zustand` de quan ly state nhe va ro rang cho auth va chat.
5. Tinh nang nhan tin realtime dung `socket.io-client`, con gui anh/video thi dung `expo-image-picker` ket hop upload qua presigned URL.
6. De xem video va file trong chat, em dung `expo-av` va `expo-web-browser`.

## 6. Ket luan

Bo thu vien hien tai cua `RushCord_Mobile` duoc chon theo huong:

- Nhe va de trien khai voi `Expo`
- Tach ro giua routing, state, network, realtime
- Phu hop bai toan chat app co dang nhap, realtime va media upload
- De giai thich kien truc vi moi tinh nang deu co thu vien phu trach ro rang
