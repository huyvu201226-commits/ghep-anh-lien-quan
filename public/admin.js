/* ============================================================
   admin.js — logic cho trang quản trị (admin.html)
   ============================================================ */

let cfg = loadConfig();

function toast(msg){
  const t = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._tm);
  toast._tm = setTimeout(()=>t.classList.remove("show"), 2200);
}

/* ---------- tabs ---------- */
function setupTabs(){
  document.querySelectorAll(".admin-tabs button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".admin-tabs button").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`.panel[data-panel="${btn.dataset.tab}"]`).classList.add("active");
    });
  });
}

/* ---------- branding ---------- */
function fillBrandingForm(){
  document.getElementById("f_siteName").value = cfg.siteName;
  document.getElementById("f_tagline").value = cfg.tagline;
  document.getElementById("f_logoEmoji").value = cfg.logoEmoji;
  document.getElementById("f_supportLink").value = cfg.supportLink || "";
  const dz = document.getElementById("dz_logo");
  if (cfg.logoImage){
    dz.classList.add("has-img");
    dz.innerHTML = `<img src="${cfg.logoImage}" alt="logo"><input type="file" accept="image/*" id="f_logoImage">`;
  }
  wireBrandingEvents();
}
function wireBrandingEvents(){
  document.getElementById("f_siteName").addEventListener("input", e=>cfg.siteName = e.target.value);
  document.getElementById("f_tagline").addEventListener("input", e=>cfg.tagline = e.target.value);
  document.getElementById("f_logoEmoji").addEventListener("input", e=>cfg.logoEmoji = e.target.value);
  document.getElementById("f_supportLink").addEventListener("input", e=>cfg.supportLink = e.target.value);
  setupImageDrop("dz_logo","f_logoImage", url=>{cfg.logoImage = url;});
}

function setupImageDrop(dzId, fileId, onLoad){
  const dz = document.getElementById(dzId);
  const bindInput = () => {
    const input = document.getElementById(fileId);
    input.addEventListener("change", e=>handle(e.target.files[0]));
  };
  const handle = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    uploadImageFile(file).then(url => {
      onLoad(url);
      dz.classList.add("has-img");
      dz.innerHTML = `<img src="${url}" alt="img"><input type="file" accept="image/*" id="${fileId}">`;
      bindInput();
    });
  };
  bindInput();
  dz.addEventListener("dragover", e=>{e.preventDefault(); dz.style.borderColor="var(--primary)";});
  dz.addEventListener("dragleave", ()=>dz.style.borderColor="");
  dz.addEventListener("drop", e=>{
    e.preventDefault(); dz.style.borderColor="";
    if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]);
  });
}

/* ---------- theme ---------- */
const COLOR_FIELDS = [
  ["bg","Nền chính"], ["surface","Khối thẻ"], ["surfaceAlt","Khối thẻ phụ"],
  ["border","Viền"], ["primary","Màu chính"], ["primary2","Màu chính 2"],
  ["accent","Nhấn / vàng"], ["cyan","Nhấn phụ"], ["text","Chữ"], ["textMuted","Chữ mờ"],
  ["sidebarBg1","Nền thanh bên trái (trên)"], ["sidebarBg2","Nền thanh bên trái (dưới)"],
  ["sidebarText","Chữ thanh bên trái"], ["sidebarTextMuted","Chữ mờ thanh bên trái"],
  ["sidebarBorder","Viền thanh bên trái"]
];
function fillThemeForm(){
  const row = document.getElementById("swatchRow");
  row.innerHTML = COLOR_FIELDS.map(([key,label])=>`
    <div class="swatch">
      <input type="color" id="c_${key}" value="${cfg.theme[key]}">
      <span>${label}</span>
    </div>`).join("");
  COLOR_FIELDS.forEach(([key])=>{
    document.getElementById("c_"+key).addEventListener("input", e=>{
      cfg.theme[key] = e.target.value;
    });
  });
  const dzBg = document.getElementById("dz_bg");
  if (cfg.theme.bgImage){
    dzBg.classList.add("has-img");
    dzBg.innerHTML = `<img src="${cfg.theme.bgImage}" alt="bg"><input type="file" accept="image/*" id="f_bgImage">`;
  }
  setupImageDrop("dz_bg","f_bgImage", url=>{cfg.theme.bgImage = url;});
  document.getElementById("clearBgBtn").addEventListener("click", ()=>{
    cfg.theme.bgImage = null;
    const dz = document.getElementById("dz_bg");
    dz.classList.remove("has-img");
    dz.innerHTML = `<div class="dz-title">Tải ảnh nền</div><div>Sẽ được phủ lớp tối để chữ dễ đọc</div><input type="file" accept="image/*" id="f_bgImage">`;
    setupImageDrop("dz_bg","f_bgImage", url=>{cfg.theme.bgImage = url;});
    toast("Đã xoá ảnh nền");
  });
}

/* ---------- widgets ---------- */
function renderWidgetRows(){
  const wrap = document.getElementById("widgetRows");
  wrap.innerHTML = cfg.widgets.map((w,i)=>`
    <div class="widget-row" data-idx="${i}">
      <div class="order-btns">
        <button type="button" class="up" ${i===0?"disabled":""}>▲</button>
        <button type="button" class="down" ${i===cfg.widgets.length-1?"disabled":""}>▼</button>
      </div>
      <span class="drag-id">${w.id}</span>
      <input type="text" class="w-label" value="${w.label}">
      <label class="switch">
        <input type="checkbox" class="w-visible" ${w.visible?"checked":""}>
        <span class="slider"></span>
      </label>
    </div>`).join("");

  wrap.querySelectorAll(".widget-row").forEach(row=>{
    const idx = parseInt(row.dataset.idx,10);
    row.querySelector(".w-label").addEventListener("input", e=>{ cfg.widgets[idx].label = e.target.value; });
    row.querySelector(".w-visible").addEventListener("change", e=>{ cfg.widgets[idx].visible = e.target.checked; });
    const up = row.querySelector(".up"), down = row.querySelector(".down");
    if (up) up.addEventListener("click", ()=>{ moveWidget(idx,-1); });
    if (down) down.addEventListener("click", ()=>{ moveWidget(idx,1); });
  });
}
function moveWidget(idx, dir){
  const j = idx+dir;
  if (j<0 || j>=cfg.widgets.length) return;
  const tmp = cfg.widgets[idx];
  cfg.widgets[idx] = cfg.widgets[j];
  cfg.widgets[j] = tmp;
  renderWidgetRows();
}

/* ---------- skin library ---------- */
let pendingLibImage = null;
let pendingLibRank = null;

function fillHeroDatalist(){
  const dl = document.getElementById("heroDatalist");
  if (dl) dl.innerHTML = HERO_LIST.map(h => `<option value="${h}">`).join("");
}

function libCardHtml(item){
  const badges = [
    item.hasButton ? `<span class="mini-badge">🔘 Nút bấm</span>` : "",
    item.hasKillNotice ? `<span class="mini-badge">💥 Thông báo hạ</span>` : ""
  ].join("");
  return `
    <div class="skin-card" data-id="${item.id}">
      <div class="skin-card__img">
        ${item.image ? `<img src="${item.image}" alt="${item.skinName}">` : `<div class="skin-card__ph">${(item.hero||"?").slice(0,2)}</div>`}
        ${item.rankImage ? `<img src="${item.rankImage}" alt="bậc" style="position:absolute;left:4px;top:4px;width:28px;height:auto;max-height:28px;object-fit:contain;">` : ""}
        <button type="button" class="lib-delete" title="Xoá">✕</button>
      </div>
      <div class="skin-card__name">${item.hero}</div>
      <div class="skin-card__sub">${item.skinName || "Trang phục mặc định"}</div>
      ${badges ? `<div class="skin-card__badges">${badges}</div>` : ""}
    </div>`;
}

function renderLibrary(){
  const grid = document.getElementById("libGrid");
  const countEl = document.getElementById("libCount");
  const lib = loadLibrary();
  countEl.textContent = lib.length + " mục";
  grid.innerHTML = lib.length
    ? lib.map(libCardHtml).join("")
    : `<div class="history__empty" style="width:100%;">Chưa có trang phục nào — thêm mục đầu tiên ở form bên trên.</div>`;

  grid.querySelectorAll(".lib-delete").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      e.stopPropagation();
      const id = btn.closest(".skin-card").dataset.id;
      const updated = loadLibrary().filter(it => it.id !== id);
      saveLibrary(updated);
      renderLibrary();
      toast("Đã xoá khỏi thư viện");
    });
  });
}

function setupLibraryForm(){
  fillHeroDatalist();
  setupImageDrop("dz_lib_image","lib_image", url=>{ pendingLibImage = url; });
  setupImageDrop("dz_lib_rank","lib_rank", url=>{ pendingLibRank = url; });

  document.getElementById("addLibBtn").addEventListener("click", ()=>{
    const hero = document.getElementById("lib_hero").value.trim();
    const skinName = document.getElementById("lib_skinName").value.trim();
    const hasButton = document.getElementById("lib_hasButton").checked;
    const hasKillNotice = document.getElementById("lib_hasKillNotice").checked;

    if (!hero){ toast("Vui lòng nhập tên tướng"); return; }

    const lib = loadLibrary();
    lib.unshift({
      id: uid(),
      hero, skinName,
      image: pendingLibImage,
      rankImage: pendingLibRank,
      hasButton, hasKillNotice
    });
    try{
      saveLibrary(lib);
    }catch(e){
      toast("Lưu thất bại — có thể ảnh quá nặng, hãy nén nhỏ lại rồi thử lại.");
      return;
    }

    // reset form
    document.getElementById("lib_hero").value = "";
    document.getElementById("lib_skinName").value = "";
    document.getElementById("lib_hasButton").checked = false;
    document.getElementById("lib_hasKillNotice").checked = false;
    pendingLibImage = null;
    pendingLibRank = null;
    const dz = document.getElementById("dz_lib_image");
    dz.classList.remove("has-img");
    dz.innerHTML = `<div class="dz-title">Tải ảnh lên</div><div>PNG/JPG, nên nén dưới 500KB</div><input type="file" accept="image/*" id="lib_image">`;
    setupImageDrop("dz_lib_image","lib_image", url=>{ pendingLibImage = url; });
    const dzR = document.getElementById("dz_lib_rank");
    dzR.classList.remove("has-img");
    dzR.innerHTML = `<div class="dz-title">Tải ảnh bậc lên</div><div>Hiển thị như 1 huy hiệu nhỏ trên ảnh trang phục, không bị cắt xén</div><input type="file" accept="image/*" id="lib_rank">`;
    setupImageDrop("dz_lib_rank","lib_rank", url=>{ pendingLibRank = url; });

    renderLibrary();
    toast("Đã thêm vào thư viện ✓");
  });

  renderLibrary();
}

/* ---------- save / reset / preview ---------- */
function doSave(){
  saveConfig(cfg);
  toast("Đã lưu cấu hình ✓");
  refreshPreview();
}
function doReset(){
  if (!confirm("Khôi phục toàn bộ cấu hình về mặc định?")) return;
  resetConfig();
  cfg = loadConfig();
  fillBrandingForm();
  fillThemeForm();
  renderWidgetRows();
  toast("Đã khôi phục mặc định");
  refreshPreview();
}
function refreshPreview(){
  const frame = document.getElementById("previewFrame");
  frame.src = "index.html?t=" + Date.now();
}

function init(){
  setupTabs();
  fillBrandingForm();
  fillThemeForm();
  renderWidgetRows();
  setupLibraryForm();

  document.getElementById("saveBtn").addEventListener("click", doSave);
  document.getElementById("resetBtn").addEventListener("click", doReset);
  document.getElementById("refreshPreviewBtn").addEventListener("click", refreshPreview);
}
document.addEventListener("DOMContentLoaded", init);
