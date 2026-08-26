/* ============================================================
   config.js — Cấu hình dùng chung giữa trang người dùng & admin
   Lưu trữ trong localStorage, key: "ghepanh_config_v1"
   ============================================================ */

const CONFIG_KEY = "ghepanh_config_v1";
const HISTORY_KEY = "ghepanh_history_v1";
const LIBRARY_KEY = "ghepanh_library_v1"; // thư viện trang phục do admin thêm (ảnh tự tải lên)

/* Đặt GRID_API_BASE = "" nếu tool này được đặt CHUNG domain với server (ví dụ trong
   public/ghepanh/ của Shop J-Hush) — gọi API cùng gốc, khỏi cần ghi domain.
   Đặt GRID_API_BASE = "https://j-hush-shop.onrender.com" nếu tool nằm ở domain KHÁC
   (nhớ bật CORS ở server, xem GUIDE.md). Trong cả 2 trường hợp, mọi ảnh tải lên (ảnh
   acc, ảnh ghép lưới…) sẽ được upload lên GridFS và lưu vĩnh viễn — chỉ lưu lại URL
   ngắn trong localStorage thay vì lưu cả ảnh base64 rất nặng.
   Để nguyên là null (mặc định) thì tool vẫn chạy bình thường, chỉ là ảnh lưu tạm dạng
   base64 trong trình duyệt (không mất khi tải lại trang F5, nhưng sẽ mất nếu xoá cache
   hoặc đổi máy/trình duyệt khác, và có thể báo lỗi hết dung lượng nếu thêm quá nhiều
   ảnh nặng). Xem GUIDE.md để nối server từng bước. */
const GRID_API_BASE = "";

/* Upload 1 file ảnh lên server GridFS (nếu đã cấu hình GRID_API_BASE), trả về URL để lưu lại.
   Nếu chưa cấu hình hoặc upload lỗi, tự rơi về lưu base64 ngay trên trình duyệt (dataURL). */
function uploadImageFile(file){
  return new Promise((resolve, reject) => {
    if (GRID_API_BASE === null){
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    const fd = new FormData();
    fd.append("image", file);
    fetch(GRID_API_BASE + "/api/upload", { method: "POST", body: fd })
      .then(r => r.json())
      .then(data => {
        if (data && data.ok && data.url) resolve(GRID_API_BASE + data.url);
        else throw new Error((data && data.error) || "Upload thất bại");
      })
      .catch(err => {
        console.warn("Upload GridFS lỗi, dùng tạm base64:", err);
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
  });
}

function uid(){
  return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,8);
}

/* Thư viện trang phục: [{id, hero, skinName, image(dataURL), hasButton, hasKillNotice}] */
function loadLibrary(){
  try { return JSON.parse(localStorage.getItem(LIBRARY_KEY)) || []; }
  catch { return []; }
}
function saveLibrary(list){
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(list));
}

/* Danh sách tướng chính thức — nguồn: lienquan.garena.vn/hoc-vien/tuong-skin/ */
const HERO_LIST = [
  "Tamyn","Flowborn","Dyadia","Edras","Goverra","Heino","Billow","Bolt Baron","Biron","Dolia",
  "Charlotte","Tachi","Dirak","Qi","Erin","Ming","Bijan","Bonnie","Teeri","Yue","Yan","Aya","Aoi",
  "Iggy","Bright","Lorion","Dextra","Sinestrea","Thorne","Allain","Zata","Rouie","Laville","Paine",
  "Ata","Keera","Ishar","Eland’orr","Krizzix","Volkath","Celica","Zip","Enzo","Yena","Errol",
  "Capheny","Hayate","D’Arcy","Veres","Florentino","Sephera","Quillen","Wiro","Richter","Elsu",
  "Y’bneth","Amily","Annette","Baldum","Roxie","Marja","Rourke","Arum","Wisp","The Flash","Max",
  "Liliana","Tulen","Omen","Lindis","TeeMee","Moren","Kil’Groth","Xeniel","Wonder Woman","Superman",
  "Tel’Annas","Astrid","Ryoma","Stuart","Arduin","Zill","Murad","Ignis","Zuka","Airi","Kaine",
  "Lauriel","Raz","Skud","Preyta","Ilumia","Slimz","Arthur","Kriknak","Ngộ Không","Maloch","Helen",
  "Jinna","Cresht","Natalya","Lumburr","Fennik","Aleister","Grakk","Nakroth","Taara","Toro","Yorn",
  "Gildur","Alice","Azzen’Ka","Ormarr","Butterfly","Violet","Chaugnar","Điêu Thuyền","Zephys",
  "Kahlii","Omega","Triệu Vân","Mganga","Krixi","Mina","Lữ Bố","Veera","Thane","Valhein"
];

const DEFAULT_CONFIG = {
  siteName: "Ghép Ảnh Liên Quân",
  tagline: "Miễn phí toàn bộ tiện ích — không giới hạn",
  logoEmoji: "⚔️",
  logoImage: null,
  supportLink: "https://zalo.me",
  theme: {
    bg: "#f3f8f5",
    bgImage: null,
    surface: "#ffffff",
    surfaceAlt: "#eaf4ee",
    border: "#d3e4d9",
    primary: "#0f5132",
    primary2: "#1e8a5a",
    accent: "#c9880f",
    cyan: "#0f8a7a",
    text: "#122019",
    textMuted: "#5c7568",
    sidebarBg1: "#0f4a30",
    sidebarBg2: "#0a2e1e",
    sidebarText: "#eef7f1",
    sidebarTextMuted: "#a9c9b8",
    sidebarBorder: "#1c5c3c"
  },
  widgets: [
    { id: "gridMerge",    label: "Ghép nhiều ảnh dạng lưới",                   hint: "Tải nhiều ảnh, tự xếp thành 1 ảnh lưới duy nhất",         visible: true },
    { id: "quantity",     label: "Số lượng ảnh ghép",                          hint: "Số lượng ảnh bạn muốn ghép trong một lượt",              visible: true },
    { id: "account",      label: "Thông tin tài khoản",                        hint: "Dùng để tool tự động lấy dữ liệu tướng, trang phục",     visible: true },
    { id: "frame",        label: "Chọn khung hình",                            hint: "Bố cục khung ảnh ghép",                                   visible: true },
    { id: "overview",     label: "Ảnh tổng quan tài khoản",                    hint: "Ảnh chụp màn hình danh sách tướng / trang phục",         visible: true },
    { id: "toggles",      label: "Tuỳ chọn ghép thêm",                         hint: "Ghép ảnh tổng phía trên • Đổi avatar",                    visible: true },
    { id: "rename",       label: "Đổi tên / Đổi số tài khoản",                 hint: "Chỉ hiển thị nếu bạn có nhu cầu đổi tên hiển thị",       visible: true },
    { id: "props",        label: "Đạo cụ thêm",                                hint: "Quân huy • Giấy cuộn tuyệt sắc",                          visible: true },
    { id: "skins",        label: "Trang phục tiến hoá",                        hint: "Chọn trang phục tiến hoá cho từng tướng (nếu có)",       visible: true },
    { id: "accessories",  label: "Phụ kiện",                                   hint: "Nút bấm, hiệu ứng hạ, điệu nhảy…",                        visible: true },
    { id: "heroDisplay",  label: "Hiển thị đầy đủ trang phục tướng chỉ định", hint: "Chọn tướng muốn hiển thị đầy đủ trang phục",             visible: true },
    { id: "topHero",      label: "Ảnh TOP tướng",                              hint: "Ảnh chụp bảng xếp hạng tướng sử dụng nhiều nhất",        visible: true },
    { id: "winrate",      label: "Ảnh tỉ lệ thắng",                            hint: "Ảnh chụp tỉ lệ thắng của từng tướng",                     visible: true },
    { id: "border",       label: "Chọn loại viền",                             hint: "Kiểu viền bao quanh ảnh ghép",                            visible: true },
    { id: "brightness",   label: "Độ sáng ảnh",                                hint: "Điều chỉnh độ sáng của ảnh kết quả",                      visible: true }
  ]
};

function deepMerge(base, extra) {
  if (Array.isArray(base)) return extra !== undefined ? extra : base;
  if (typeof base === "object" && base !== null) {
    const out = { ...base };
    if (extra && typeof extra === "object") {
      for (const k of Object.keys(base)) {
        out[k] = deepMerge(base[k], extra[k]);
      }
    }
    return out;
  }
  return extra !== undefined ? extra : base;
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    const parsed = JSON.parse(raw);
    const merged = deepMerge(DEFAULT_CONFIG, parsed);
    // widgets array: prefer saved array wholesale if present (keeps custom order)
    if (Array.isArray(parsed.widgets) && parsed.widgets.length) {
      merged.widgets = parsed.widgets;
    }
    return merged;
  } catch (e) {
    console.warn("Không đọc được cấu hình, dùng mặc định.", e);
    return structuredClone(DEFAULT_CONFIG);
  }
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

function resetConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

function applyTheme(cfg) {
  const r = document.documentElement.style;
  const t = cfg.theme;
  r.setProperty("--bg", t.bg);
  r.setProperty("--surface", t.surface);
  r.setProperty("--surface-alt", t.surfaceAlt);
  r.setProperty("--border", t.border);
  r.setProperty("--primary", t.primary);
  r.setProperty("--primary-2", t.primary2);
  r.setProperty("--accent", t.accent);
  r.setProperty("--cyan", t.cyan);
  r.setProperty("--text", t.text);
  r.setProperty("--text-muted", t.textMuted);
  r.setProperty("--sidebar-bg1", t.sidebarBg1);
  r.setProperty("--sidebar-bg2", t.sidebarBg2);
  r.setProperty("--sidebar-text", t.sidebarText);
  r.setProperty("--sidebar-text-muted", t.sidebarTextMuted);
  r.setProperty("--sidebar-border", t.sidebarBorder);
  if (t.bgImage) {
    document.body.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.75)), url(${t.bgImage})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundPosition = "center";
  } else {
    document.body.style.backgroundImage = "";
  }
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}
function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 12)));
}
