/* ============================================================
   app.js — logic cho trang người dùng (index.html)
   ============================================================ */

let cfg = loadConfig();
let state = {
  overviewImg: null,   // dataURL ảnh tổng quan
  topHeroImg: null,
  winrateImg: null,
  borderStyle: "default", // default | gold
  brightness: 0,
  quantity: 1,
  selectedSkinIds: new Set(),
  heroDisplaySelectedIds: new Set(),
  gridImages: [],   // { id, url, name?, rankImage? } — ảnh dùng cho tiện ích ghép lưới
  gridCols: "auto", // dùng làm gợi ý "số ảnh mỗi hàng" cho thuật toán ghép hàng cân chiều cao (justified rows)
  gridHeroImg: null,     // dataURL ảnh acc hiện tại, hiển thị to ở trên lưới
  gridSwapPick: null,    // index đang được chọn để chờ đổi chỗ (bấm trực tiếp vào ảnh đã ghép)
  lastGridLayout: null   // toạ độ layout của lần vẽ lưới gần nhất, dùng để dò ô khi bấm vào canvas
};

function toast(msg){
  const t = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._tm);
  toast._tm = setTimeout(()=>t.classList.remove("show"), 2200);
}

/* ---------- widget templates ---------- */
const WIDGET_TEMPLATES = {
  gridMerge: (w) => `
    <div class="card" id="gridMergeCard">
      <div class="card__head">
        <div class="card__title">🧩 ${w.label}</div>
        <span class="tag" style="position:static;">MỚI</span>
      </div>
      <div class="card__hint" style="margin-bottom:12px;">${w.hint} · chọn số cột rồi bấm Ghép Lưới Ảnh. Nếu bạn đã tải "Ảnh tổng quan tài khoản" ở mục riêng phía trên (bảng thông tin nhỏ), nó sẽ tự hiển thị cạnh ảnh acc chính ở đây. Sau khi ghép xong, bấm trực tiếp vào 2 ảnh trên khung kết quả bên phải để đổi chỗ cho nhau.</div>

      <div class="field">
        <label class="flabel">Ảnh acc hiện tại (hiển thị to ở trên)</label>
      </div>
      <div class="dropzone" id="dz_gridHero">
        <div class="dz-title">Kéo & thả ảnh vào đây</div>
        <div>hoặc nhấn để chọn ảnh đại diện to phía trên lưới</div>
        <input type="file" accept="image/*" id="w_gridHero_file">
      </div>

      <div class="field" style="margin-top:14px;">
        <label class="flabel">Số ảnh mỗi hàng (ước lượng)</label>
        <div class="seg" id="gridColsSeg">
          <button type="button" class="active" data-cols="auto">Tự động (~4)</button>
          <button type="button" data-cols="2">2 ảnh</button>
          <button type="button" data-cols="3">3 ảnh</button>
          <button type="button" data-cols="4">4 ảnh</button>
        </div>
        <div class="card__hint" style="margin-top:6px;">Ảnh trong cùng 1 hàng sẽ tự co giãn về chung 1 chiều cao (giữ nguyên tỉ lệ gốc, không méo, không viền trắng thừa) rồi lấp đầy hết bề rộng hàng; hết chỗ sẽ tự ngắt xuống hàng mới.</div>
      </div>

      <div class="dropzone" id="dz_gridImages">
        <div class="dz-title">Kéo & thả nhiều ảnh vào đây</div>
        <div>hoặc nhấn để chọn nhiều ảnh cùng lúc · không giới hạn số lượng</div>
        <input type="file" accept="image/*" id="w_grid_files" multiple>
      </div>

      <div class="field skin-search-wrap" id="gridNameWrap" style="margin-top:10px;">
        <input type="text" id="gridNameSearch" placeholder="…hoặc gõ tên tướng / trang phục để tìm và thêm vào lưới" autocomplete="off">
        <div class="skin-dropdown" id="gridNameDropdown">
          <div class="skin-grid" id="gridNameGrid"></div>
        </div>
      </div>

      <div class="grid-thumbs" id="gridThumbs"></div>
      <div class="grid-empty-hint" id="gridEmptyHint">Chưa có ảnh nào — hãy thêm ít nhất 2 ảnh để ghép lưới. Có thể kéo-thả để sắp xếp lại thứ tự trước khi ghép.</div>

      <button class="btn" id="gridMergeBtn" style="margin-top:14px;">🧩 Ghép Lưới Ảnh</button>
    </div>`,
  quantity: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <div class="field">
        <input type="number" min="1" max="20" value="1" id="w_quantity" placeholder="Số lượng ảnh ghép">
        <div class="card__hint" style="margin-top:6px;">${w.hint}</div>
      </div>
    </div>`,
  account: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <div class="row2">
        <div class="field"><input type="text" id="w_acc_user" placeholder="Tên tài khoản"></div>
        <div class="field"><input type="password" id="w_acc_pass" placeholder="Mật khẩu"></div>
      </div>
      <div class="card__hint">${w.hint} · dữ liệu chỉ lưu tạm trên trình duyệt, không gửi đi đâu cả.</div>
    </div>`,
  frame: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <div class="field">
        <select id="w_frame">
          <option value="default">Mặc định</option>
          <option value="weekend">Cuối tuần</option>
          <option value="event">Sự kiện đặc biệt</option>
          <option value="minimal">Tối giản</option>
        </select>
        <div class="card__hint" style="margin-top:6px;">${w.hint}</div>
      </div>
    </div>`,
  overview: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <div class="dropzone" id="dz_overview">
        <div class="dz-title">Kéo & thả ảnh vào đây</div>
        <div>hoặc nhấn để chọn ảnh · hỗ trợ .jpg .jpeg .png</div>
        <input type="file" accept="image/*" id="w_overview_file">
      </div>
    </div>`,
  toggles: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <label class="checkline"><input type="checkbox" id="w_toggle_top"> Ghép ảnh tổng phía trên</label>
      <label class="checkline"><input type="checkbox" id="w_toggle_avatar"> Đổi avatar</label>
    </div>`,
  rename: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <div class="row2">
        <div class="field"><input type="text" id="w_rename_card" placeholder="Số thẻ đổi tên (nếu có)"></div>
        <div class="field"><input type="text" id="w_rename_id" placeholder="Mã số tài khoản (nếu có)"></div>
      </div>
    </div>`,
  props: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <label class="checkline"><input type="checkbox" id="w_props_on" checked> Bật đạo cụ thêm</label>
      <div class="row2" id="propsFields">
        <div class="field"><input type="text" id="w_props_badge" placeholder="Số quân huy"></div>
        <div class="field"><input type="text" id="w_props_scroll" placeholder="Giấy cuộn tuyệt sắc"></div>
      </div>
    </div>`,
  skins: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <div class="card__hint" style="margin-bottom:10px;">${w.hint} · nhấn vào ô tìm hoặc gõ tên tướng/trang phục, danh sách gợi ý hiện ngay bên dưới — bấm vào ảnh để thêm (thêm được nhiều ảnh), bấm ✕ trên ảnh đã chọn để bỏ khỏi nhóm.</div>
      <div class="field skin-search-wrap" id="skinWrap">
        <input type="text" id="skinSearch" placeholder="Tìm theo tên tướng hoặc tên trang phục…" autocomplete="off">
        <div class="skin-dropdown" id="skinDropdown">
          <div class="skin-grid" id="skinGrid"></div>
        </div>
      </div>
      <div class="skin-selected-wrap">
        <div class="skin-selected-line" id="skinSelectedHint">Chưa chọn trang phục nào</div>
        <div class="skin-selected-grid" id="skinSelectedGrid"></div>
      </div>
    </div>`,
  accessories: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <select id="w_accessory">
        <option value="">Chọn phụ kiện (nút bấm, hiệu ứng hạ, điệu nhảy…)</option>
        <option>Nút bấm</option>
        <option>Hiệu ứng hạ</option>
        <option>Điệu nhảy</option>
      </select>
    </div>`,
  heroDisplay: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <div class="card__hint" style="margin-bottom:10px;">${w.hint} · nhấn vào ô tìm hoặc gõ tên tướng/trang phục, danh sách gợi ý hiện ngay bên dưới dạng ảnh + tên trang phục — bấm vào ảnh để thêm vào nhóm ghép (thêm được nhiều ảnh), bấm ✕ trên ảnh đã chọn để bỏ khỏi nhóm.</div>
      <div class="field skin-search-wrap" id="heroDisplayWrap">
        <input type="text" id="heroDisplaySearch" placeholder="Tìm theo tên tướng hoặc tên trang phục…" autocomplete="off">
        <div class="skin-dropdown" id="heroDisplayDropdown">
          <div class="skin-grid" id="heroDisplayGrid"></div>
        </div>
      </div>
      <div class="skin-selected-wrap">
        <div class="skin-selected-line" id="heroDisplaySelectedHint">Chưa chọn trang phục nào</div>
        <div class="skin-selected-grid" id="heroDisplaySelectedGrid"></div>
      </div>
    </div>`,
  topHero: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <div class="dropzone" id="dz_topHero">
        <div class="dz-title">Kéo & thả ảnh vào đây</div>
        <div>hoặc nhấn để chọn ảnh</div>
        <input type="file" accept="image/*" id="w_topHero_file">
      </div>
    </div>`,
  winrate: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <div class="dropzone" id="dz_winrate" style="margin-bottom:10px;">
        <div class="dz-title">Kéo & thả ảnh vào đây</div>
        <div>hoặc nhấn để chọn ảnh</div>
        <input type="file" accept="image/*" id="w_winrate_file">
      </div>
      <label class="checkline"><input type="checkbox" id="w_winrate_52"> Chỉ lấy tướng có tỉ lệ thắng trên 52%</label>
    </div>`,
  border: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <div class="seg">
        <button type="button" class="active" data-border="default">✓ Mặc định</button>
        <button type="button" data-border="gold">Vàng ✨</button>
      </div>
    </div>`,
  brightness: (w) => `
    <div class="card">
      <div class="card__head"><div class="card__title">${w.label}</div></div>
      <div class="slider-wrap">
        <input type="range" id="w_brightness" min="-60" max="60" value="0">
        <span class="slider-val" id="w_brightness_val">Mặc định</span>
      </div>
    </div>`
};

function renderBrand(){
  document.getElementById("brandName").textContent = cfg.siteName;
  document.getElementById("brandTag").textContent = cfg.tagline.toUpperCase();
  document.title = cfg.siteName + " — Miễn phí";
  const logoEl = document.getElementById("brandLogo");
  logoEl.innerHTML = cfg.logoImage ? `<img src="${cfg.logoImage}" alt="logo">` : cfg.logoEmoji;
  document.getElementById("heroTitle").textContent = "Ghép ảnh đội hình, mở toàn bộ tiện ích";
  document.getElementById("heroSub").textContent = cfg.tagline + ". Toàn bộ xử lý ảnh diễn ra ngay trên trình duyệt của bạn.";
  document.getElementById("supportLink").href = cfg.supportLink || "#";
}

function renderWidgets(){
  const col = document.getElementById("widgetsCol");
  col.innerHTML = "";
  cfg.widgets.filter(w => w.visible).forEach(w => {
    const tpl = WIDGET_TEMPLATES[w.id];
    if (!tpl) return;
    col.insertAdjacentHTML("beforeend", tpl(w));
  });
  wireWidgetEvents();
}

function setupDropzone(dzId, fileId, onLoad){
  const dz = document.getElementById(dzId);
  const input = document.getElementById(fileId);
  if (!dz || !input) return;
  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    uploadImageFile(file).then(url => {
      onLoad(url);
      dz.classList.add("has-img");
      dz.innerHTML = `<img src="${url}" alt="preview"><input type="file" accept="image/*" id="${fileId}">`;
      document.getElementById(fileId).addEventListener("change", (ev)=>handleFile(ev.target.files[0]));
    });
  };
  input.addEventListener("change", (e)=>handleFile(e.target.files[0]));
  dz.addEventListener("dragover", (e)=>{e.preventDefault(); dz.style.borderColor="var(--primary)";});
  dz.addEventListener("dragleave", ()=>{dz.style.borderColor="";});
  dz.addEventListener("drop", (e)=>{
    e.preventDefault(); dz.style.borderColor="";
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
}

/* Nhà máy tạo picker "tìm & thêm nhiều trang phục" dùng chung cho các widget
   cần chọn ảnh từ thư viện (skins, heroDisplay…) — mỗi widget dùng 1 id-prefix
   riêng (vd "skin", "heroDisplay") và 1 Set riêng để lưu lựa chọn của mình. */
function createSkinPicker(prefix, selectedSet){
  let docHandler = null; // gỡ listener cũ mỗi lần setup lại, tránh rò rỉ khi widget re-render

  return function setup(){
    const wrap = document.getElementById(prefix + "Wrap");
    const dropdown = document.getElementById(prefix + "Dropdown");
    const grid = document.getElementById(prefix + "Grid");
    const search = document.getElementById(prefix + "Search");
    const selectedGrid = document.getElementById(prefix + "SelectedGrid");
    const selectedHint = document.getElementById(prefix + "SelectedHint");
    if (!grid || !wrap) return;

    const library = loadLibrary();

    function thumbHtml(item, small){
      return item.image
        ? `<img src="${item.image}" alt="${item.skinName||item.hero}">`
        : `<div class="${small?"skin-chip__ph":"skin-card__ph"}">${(item.hero||"?").slice(0,2)}</div>`;
    }

    function cardHtml(item){
      const selected = selectedSet.has(item.id);
      const badges = [
        item.hasButton ? `<span class="mini-badge">🔘 Nút bấm</span>` : "",
        item.hasKillNotice ? `<span class="mini-badge">💥 Thông báo hạ</span>` : ""
      ].join("");
      return `
        <div class="skin-card ${selected?"selected":""}" data-id="${item.id}">
          <div class="skin-card__img">${thumbHtml(item,false)}<div class="skin-check">✓</div></div>
          <div class="skin-card__name">${item.hero}</div>
          <div class="skin-card__sub">${item.skinName || "Trang phục mặc định"}</div>
          ${badges ? `<div class="skin-card__badges">${badges}</div>` : ""}
        </div>`;
    }

    function openDropdown(){ dropdown.classList.add("open"); }
    function closeDropdown(){ dropdown.classList.remove("open"); }

    function renderDropdown(){
      const q = (search.value || "").trim().toLowerCase();
      const filtered = !q ? library : library.filter(it =>
        (it.hero||"").toLowerCase().includes(q) || (it.skinName||"").toLowerCase().includes(q)
      );
      if (!library.length){
        grid.innerHTML = `<div class="history__empty" style="width:100%;">Chưa có trang phục nào trong thư viện. Vào <b>Trang quản trị → Thư viện trang phục</b> để admin thêm ảnh.</div>`;
      } else if (!filtered.length){
        grid.innerHTML = `<div class="history__empty" style="width:100%;">Không tìm thấy kết quả cho "${q}"</div>`;
      } else {
        grid.innerHTML = filtered.map(cardHtml).join("");
      }
      grid.querySelectorAll(".skin-card").forEach(card=>{
        card.addEventListener("click", ()=>{
          const id = card.dataset.id;
          selectedSet.add(id);            // bấm để thêm — có thể thêm nhiều ảnh liên tiếp
          card.classList.add("selected");
          renderSelected();
        });
      });
    }

    function renderSelected(){
      const chosen = library.filter(it => selectedSet.has(it.id));
      selectedHint.innerHTML = chosen.length
        ? `<b>${chosen.length} trang phục đã chọn</b> · bấm ✕ trên ảnh để bỏ khỏi nhóm`
        : "Chưa chọn trang phục nào";
      selectedGrid.innerHTML = chosen.map(item => `
        <div class="skin-chip" data-id="${item.id}">
          <button type="button" class="skin-chip__remove" data-remove="${item.id}" title="Bỏ khỏi nhóm">✕</button>
          <div class="skin-chip__img">${thumbHtml(item,true)}</div>
          <div class="skin-chip__name">${item.hero}</div>
          <div class="skin-chip__sub">${item.skinName || "Mặc định"}</div>
        </div>`).join("");
      selectedGrid.querySelectorAll("[data-remove]").forEach(btn=>{
        btn.addEventListener("click", (e)=>{
          e.stopPropagation();
          selectedSet.delete(btn.dataset.remove);
          renderSelected();
          grid.querySelectorAll(".skin-card").forEach(card=>{
            card.classList.toggle("selected", selectedSet.has(card.dataset.id));
          });
        });
      });
    }

    search.addEventListener("focus", ()=>{ renderDropdown(); openDropdown(); });
    search.addEventListener("input", ()=>{ renderDropdown(); openDropdown(); });
    if (docHandler) document.removeEventListener("click", docHandler);
    docHandler = (e)=>{ if (!wrap.contains(e.target)) closeDropdown(); };
    document.addEventListener("click", docHandler);

    renderSelected();
  };
}

const setupSkinPicker = createSkinPicker("skin", state.selectedSkinIds);
const setupHeroDisplayPicker = createSkinPicker("heroDisplay", state.heroDisplaySelectedIds);

/* Ô "tìm tên để thêm vào lưới" — khác skin picker ở chỗ mỗi lần bấm là thêm
   1 ảnh mới vào state.gridImages (mảng, cho phép thêm trùng), không phải chọn/bỏ chọn 1 Set. */
function setupGridNameSearch(){
  const wrap = document.getElementById("gridNameWrap");
  const dropdown = document.getElementById("gridNameDropdown");
  const grid = document.getElementById("gridNameGrid");
  const search = document.getElementById("gridNameSearch");
  if (!wrap || !search) return;

  const library = loadLibrary();

  function cardHtml(item){
    return `
      <div class="skin-card" data-id="${item.id}">
        <div class="skin-card__img">${item.image ? `<img src="${item.image}" alt="${item.skinName||item.hero}">` : `<div class="skin-card__ph">${(item.hero||"?").slice(0,2)}</div>`}</div>
        <div class="skin-card__name">${item.hero}</div>
        <div class="skin-card__sub">${item.skinName || "Trang phục mặc định"}</div>
      </div>`;
  }

  function openDropdown(){ dropdown.classList.add("open"); }
  function closeDropdown(){ dropdown.classList.remove("open"); }

  function renderDropdown(){
    const q = (search.value || "").trim().toLowerCase();
    const filtered = !q ? library : library.filter(it =>
      (it.hero||"").toLowerCase().includes(q) || (it.skinName||"").toLowerCase().includes(q)
    );
    if (!library.length){
      grid.innerHTML = `<div class="history__empty" style="width:100%;">Chưa có trang phục nào trong thư viện. Vào <b>Trang quản trị → Thư viện trang phục</b> để admin thêm ảnh, hoặc dùng ô tải ảnh từ máy ở trên.</div>`;
    } else if (!filtered.length){
      grid.innerHTML = `<div class="history__empty" style="width:100%;">Không tìm thấy kết quả cho "${q}"</div>`;
    } else {
      grid.innerHTML = filtered.map(cardHtml).join("");
    }
    grid.querySelectorAll(".skin-card").forEach(card=>{
      card.addEventListener("click", ()=>{
        const item = library.find(it => it.id === card.dataset.id);
        if (!item || !item.image){ toast("Trang phục này chưa có ảnh, không thêm được"); return; }
        state.gridImages.push({
          id: "g" + Date.now() + Math.random().toString(36).slice(2,7),
          url: item.image,
          name: item.skinName ? `${item.hero} - ${item.skinName}` : item.hero,
          rankImage: item.rankImage || null
        });
        renderGridThumbs();
        toast(`Đã thêm "${item.hero} · ${item.skinName||"mặc định"}" vào lưới`);
      });
    });
  }

  search.addEventListener("focus", ()=>{ renderDropdown(); openDropdown(); });
  search.addEventListener("input", ()=>{ renderDropdown(); openDropdown(); });
  document.addEventListener("click", (e)=>{ if (!wrap.contains(e.target)) closeDropdown(); });
}

function wireWidgetEvents(){
  setupGridMerge();
  setupGridNameSearch();
  setupSkinPicker();
  setupHeroDisplayPicker();
  setupDropzone("dz_overview","w_overview_file",(url)=>{state.overviewImg=url;});
  setupDropzone("dz_topHero","w_topHero_file",(url)=>{state.topHeroImg=url;});
  setupDropzone("dz_winrate","w_winrate_file",(url)=>{state.winrateImg=url;});
  setupDropzone("dz_gridHero","w_gridHero_file",(url)=>{state.gridHeroImg=url;});

  const propsOn = document.getElementById("w_props_on");
  const propsFields = document.getElementById("propsFields");
  if (propsOn && propsFields){
    propsOn.addEventListener("change", ()=>{propsFields.style.opacity = propsOn.checked ? "1":".4";});
  }

  document.querySelectorAll("[data-border]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll("[data-border]").forEach(b=>{b.classList.remove("active"); b.textContent=b.dataset.border==="gold"?"Vàng ✨":"Mặc định";});
      btn.classList.add("active");
      btn.textContent = (btn.dataset.border==="gold" ? "✓ Vàng ✨" : "✓ Mặc định");
      state.borderStyle = btn.dataset.border;
    });
  });

  const brightness = document.getElementById("w_brightness");
  if (brightness){
    brightness.addEventListener("input", ()=>{
      state.brightness = parseInt(brightness.value,10);
      const label = state.brightness === 0 ? "Mặc định" : (state.brightness>0? "+"+state.brightness : state.brightness);
      document.getElementById("w_brightness_val").textContent = label;
    });
  }
}

/* ---------- canvas compositing ---------- */
function drawCover(ctx, img, x, y, w, h){
  const ir = img.width / img.height, tr = w / h;
  let sx=0, sy=0, sw=img.width, sh=img.height;
  if (ir > tr){ sw = img.height*tr; sx=(img.width-sw)/2; }
  else { sh = img.width/tr; sy=(img.height-sh)/2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/* vẽ ảnh giữ nguyên tỉ lệ gốc, không cắt — thu vừa khung rồi căn giữa */
function drawContain(ctx, img, x, y, w, h){
  const ir = img.width / img.height, tr = w / h;
  let dw = w, dh = h;
  if (ir > tr){ dh = w / ir; } else { dw = h * ir; }
  const dx = x + (w-dw)/2, dy = y + (h-dh)/2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function loadImg(src){
  return new Promise((res,rej)=>{
    const im = new Image();
    im.onload = ()=>res(im);
    im.onerror = rej;
    im.src = src;
  });
}

async function generateComposite(){
  const canvas = document.getElementById("resultCanvas");
  const canvasWrap = document.getElementById("canvasWrap");
  canvas.width = 720; canvas.height = 900; // reset về kích thước cố định (khác chế độ ghép lưới)
  canvasWrap.classList.remove("auto-h", "grid-mode");
  state.lastGridLayout = null;
  state.gridSwapPick = null;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  // background
  const bgGrad = ctx.createLinearGradient(0,0,0,H);
  bgGrad.addColorStop(0, cfg.theme.surfaceAlt);
  bgGrad.addColorStop(1, cfg.theme.bg);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0,0,W,H);

  const pad = 26;
  const innerW = W - pad*2, innerH = H - pad*2 - 70;

  if (state.overviewImg){
    try{
      const img = await loadImg(state.overviewImg);
      ctx.save();
      ctx.fillStyle = cfg.theme.surface;
      ctx.fillRect(pad, pad, innerW, innerH);
      ctx.filter = `brightness(${100+state.brightness}%)`;
      drawContain(ctx, img, pad, pad, innerW, innerH); // giữ nguyên toàn bộ ảnh, không cắt xén
      ctx.restore();
    }catch(e){}
  } else {
    ctx.fillStyle = cfg.theme.surface;
    ctx.fillRect(pad,pad,innerW,innerH);
    ctx.fillStyle = cfg.theme.textMuted;
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Chưa có ảnh tổng quan", W/2, H/2);
  }

  // border
  ctx.lineWidth = state.borderStyle === "gold" ? 8 : 5;
  ctx.strokeStyle = state.borderStyle === "gold" ? (cfg.theme.accent) : cfg.theme.primary;
  ctx.strokeRect(pad, pad, innerW, innerH);
  if (state.borderStyle === "gold"){
    ctx.strokeStyle = "#fff8";
    ctx.lineWidth = 2;
    ctx.strokeRect(pad+8, pad+8, innerW-16, innerH-16);
  }

  // small hero thumbnails strip if topHero/winrate provided
  const thumbs = [state.topHeroImg, state.winrateImg].filter(Boolean);
  if (thumbs.length){
    const ty = pad + innerH + 14, th = 46, tw = 46;
    for (let i=0;i<thumbs.length;i++){
      try{
        const im = await loadImg(thumbs[i]);
        ctx.save();
        ctx.fillStyle = cfg.theme.surface;
        ctx.fillRect(pad + i*(tw+8), ty, tw, th);
        drawContain(ctx, im, pad + i*(tw+8), ty, tw, th);
        ctx.strokeStyle = cfg.theme.border; ctx.lineWidth=2;
        ctx.strokeRect(pad + i*(tw+8), ty, tw, th);
        ctx.restore();
      }catch(e){}
    }
  }

  // trang phục đã chọn từ thư viện — vẽ dải ảnh nhỏ + phụ kiện đi kèm
  // trang phục đã chọn từ thư viện — gồm cả "Trang phục tiến hoá" và "Hiển thị trang phục tướng chỉ định"
  const chosenSkinIds = new Set([...state.selectedSkinIds, ...state.heroDisplaySelectedIds]);
  const chosenSkins = loadLibrary().filter(it => chosenSkinIds.has(it.id));
  if (chosenSkins.length){
    const sy = pad + innerH + (thumbs.length ? 68 : 14);
    const sSize = 40, gap = 8;
    for (let i=0;i<chosenSkins.length && i<8;i++){
      const sx = pad + i*(sSize+gap);
      const it = chosenSkins[i];
      try{
        if (it.image){
          const im = await loadImg(it.image);
          ctx.save();
          ctx.fillStyle = cfg.theme.surfaceAlt;
          ctx.fillRect(sx, sy, sSize, sSize);
          drawContain(ctx, im, sx, sy, sSize, sSize);
          ctx.restore();
        } else {
          ctx.fillStyle = cfg.theme.surfaceAlt;
          ctx.fillRect(sx, sy, sSize, sSize);
        }
        ctx.strokeStyle = cfg.theme.primary; ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, sSize, sSize);
        // chấm phụ kiện góc dưới phải
        if (it.hasButton || it.hasKillNotice){
          ctx.fillStyle = cfg.theme.accent;
          ctx.beginPath();
          ctx.arc(sx+sSize-5, sy+sSize-5, 5, 0, Math.PI*2);
          ctx.fill();
        }
      }catch(e){}
    }
  }

  // watermark / free badge
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = cfg.theme.accent;
  ctx.fillText("MIỄN PHÍ · " + cfg.siteName, W-pad, H-14);

  finalizeResult(canvas, "Ghép ảnh hoàn tất — miễn phí, không trừ số dư nào cả ✨");
}

/* ---------- shared: show + save + toast the finished canvas ---------- */
function finalizeResult(canvas, msg){
  canvas.style.display = "block";
  document.getElementById("canvasPlaceholder").style.display = "none";
  document.getElementById("downloadBtn").style.display = "block";

  const dataUrl = canvas.toDataURL("image/png");
  const hist = loadHistory();
  hist.unshift({ url: dataUrl, ts: Date.now() });
  saveHistory(hist);
  renderHistory();
  toast(msg || "Ghép ảnh hoàn tất — miễn phí, không trừ số dư nào cả ✨");
}

/* ---------- grid image merge (giống TileSnapImage: nhiều ảnh -> 1 ảnh lưới) ---------- */
function renderGridThumbs(){
  const wrap = document.getElementById("gridThumbs");
  const hint = document.getElementById("gridEmptyHint");
  if (!wrap) return;
  hint.classList.toggle("hidden", state.gridImages.length > 0);
  wrap.innerHTML = state.gridImages.map((g, i) => `
    <div class="grid-thumb" data-gid="${g.id}" draggable="true" title="Kéo để đổi thứ tự">
      <img src="${g.url}" alt="ảnh ${i+1}">
      <span class="grid-thumb__order">${i+1}</span>
      <button type="button" class="grid-thumb__remove" data-remove="${g.id}" title="Xoá ảnh này">✕</button>
    </div>`).join("");
  wrap.querySelectorAll("[data-remove]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.remove;
      state.gridImages = state.gridImages.filter(g => g.id !== id);
      renderGridThumbs();
    });
  });

  // kéo-thả để đổi thứ tự ảnh trước khi ghép
  let dragId = null;
  wrap.querySelectorAll(".grid-thumb").forEach(el=>{
    el.addEventListener("dragstart", ()=>{ dragId = el.dataset.gid; el.style.opacity = ".4"; });
    el.addEventListener("dragend", ()=>{ el.style.opacity = ""; });
    el.addEventListener("dragover", (e)=> e.preventDefault());
    el.addEventListener("drop", (e)=>{
      e.preventDefault();
      const targetId = el.dataset.gid;
      if (!dragId || dragId === targetId) return;
      const from = state.gridImages.findIndex(g => g.id === dragId);
      const to = state.gridImages.findIndex(g => g.id === targetId);
      if (from === -1 || to === -1) return;
      const [moved] = state.gridImages.splice(from, 1);
      state.gridImages.splice(to, 0, moved);
      renderGridThumbs();
    });
  });
}

function addGridFiles(fileList){
  const files = Array.from(fileList || []).filter(f => f.type && f.type.startsWith("image/"));
  if (!files.length) return;
  let pending = files.length;
  files.forEach(file => {
    uploadImageFile(file).then(url => {
      state.gridImages.push({ id: "g" + Date.now() + Math.random().toString(36).slice(2,7), url });
      pending--;
      if (pending === 0) renderGridThumbs();
    }).catch(()=>{ pending--; if (pending === 0) renderGridThumbs(); });
  });
}

function setupGridMerge(){
  const dz = document.getElementById("dz_gridImages");
  const input = document.getElementById("w_grid_files");
  const seg = document.getElementById("gridColsSeg");
  const btn = document.getElementById("gridMergeBtn");
  if (!dz || !input) return;

  renderGridThumbs();

  input.addEventListener("change", (e)=>{ addGridFiles(e.target.files); input.value = ""; });
  dz.addEventListener("dragover", (e)=>{ e.preventDefault(); dz.style.borderColor = "var(--primary)"; });
  dz.addEventListener("dragleave", ()=>{ dz.style.borderColor = ""; });
  dz.addEventListener("drop", (e)=>{
    e.preventDefault(); dz.style.borderColor = "";
    if (e.dataTransfer.files && e.dataTransfer.files.length) addGridFiles(e.dataTransfer.files);
  });

  seg.querySelectorAll("[data-cols]").forEach(b=>{
    b.addEventListener("click", ()=>{
      seg.querySelectorAll("[data-cols]").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      state.gridCols = b.dataset.cols;
    });
  });

  btn.addEventListener("click", generateGridComposite);
  setupGridSwapClicks();
}

/* Vẽ lưới (không lưu lịch sử / không toast) — dùng chung cho lần ghép đầu tiên
   và cho mỗi lần bấm-đổi-chỗ để redraw lại. highlightIndex: ô đang được chọn
   chờ đổi chỗ (viền vàng), hoặc null nếu không có ô nào đang chọn. */
function truncateToWidth(ctx, text, maxWidth){
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

/* Xếp ảnh theo "hàng cân bằng chiều cao" (justified rows, kiểu Flickr/Google Photos):
   mỗi ảnh giữ nguyên tỉ lệ gốc, không méo, không viền trắng thừa — các ảnh trong cùng
   1 hàng được co giãn về CHUNG 1 chiều cao rồi lấp đầy vừa khít bề rộng hàng; hết chỗ
   (ảnh tiếp theo sẽ vượt quá bề rộng) thì tự ngắt xuống hàng mới. targetPerRow chỉ là
   gợi ý ban đầu để ước lượng chiều cao hàng (ảnh to nhất mỗi hàng ~ 1/targetPerRow bề rộng),
   số ảnh thực tế mỗi hàng vẫn co giãn tự nhiên theo tỉ lệ từng ảnh.  */
async function layoutJustifiedRows(images, containerWidth, gap, targetPerRow, nameH){
  const loaded = await Promise.all(images.map(async (item, i) => {
    try{ const img = await loadImg(item.url); return { i, item, aspect: (img.width / img.height) || 1 }; }
    catch(e){ return { i, item, aspect: 1 }; }
  }));

  const perRow = Math.max(1, Math.min(targetPerRow, loaded.length));
  const avgAspect = loaded.reduce((s,l)=> s + l.aspect, 0) / loaded.length || 1;
  const guessH = (containerWidth - gap*(perRow-1)) / (perRow * avgAspect);
  const targetRowH = Math.max(70, Math.min(guessH, 340)); // chiều cao hàng nhỏ nhất có thể, không quá to/nhỏ

  // đóng hàng theo kiểu "greedy": thêm ảnh vào hàng hiện tại tới khi vượt bề rộng thì ngắt dòng
  const rowsRaw = [];
  let current = [];
  let currentW = 0;
  loaded.forEach(l => {
    const wAtTarget = l.aspect * targetRowH;
    const extra = current.length ? gap : 0;
    if (current.length && (currentW + extra + wAtTarget) > containerWidth){
      rowsRaw.push(current);
      current = [l];
      currentW = wAtTarget;
    } else {
      current.push(l);
      currentW += extra + wAtTarget;
    }
  });
  if (current.length) rowsRaw.push(current);

  // "justify" từng hàng: giải lại chiều cao thật của hàng đó sao cho tổng bề rộng khớp vừa khít containerWidth
  const items = [];
  let y = 0;
  rowsRaw.forEach(row => {
    const totalAspect = row.reduce((s,r)=> s + r.aspect, 0);
    const rowH = Math.max(56, (containerWidth - gap*(row.length-1)) / totalAspect);
    let x = 0;
    row.forEach(r => {
      const w = r.aspect * rowH;
      items.push({ index: r.i, item: r.item, x, y, w, h: rowH });
      x += w + gap;
    });
    y += rowH + nameH + gap;
  });
  const gridH = items.length ? (y - gap) : 0;
  return { items, gridH };
}

async function renderGridComposite(highlightIndex){
  const n = state.gridImages.length;
  if (n < 2) return false;

  const canvas = document.getElementById("resultCanvas");
  const ctx = canvas.getContext("2d");
  const canvasWrap = document.getElementById("canvasWrap");

  // "Số ảnh mỗi hàng" chỉ là gợi ý ước lượng chiều cao ban đầu cho thuật toán ghép hàng cân chiều cao bên dưới
  const targetPerRow = state.gridCols === "auto" ? 4 : (parseInt(state.gridCols, 10) || 4);

  const hasNames = state.gridImages.some(g => g.name);
  const nameH = hasNames ? 22 : 0; // chỗ in tên skin bằng chữ, không khung, ngay dưới mỗi ảnh

  const pad = 20, gap = 10;
  const minCellW = 160;
  const W = Math.max(720, Math.round(pad*2 + targetPerRow*minCellW + gap*(targetPerRow-1)));
  const innerW = W - pad*2;

  const { items: gridItems, gridH } = await layoutJustifiedRows(state.gridImages, innerW, gap, targetPerRow, nameH);

  const heroGap = (state.gridHeroImg || state.overviewImg) ? 16 : 0;
  const bottomBar = 34; // chỗ cho watermark

  // ảnh acc hiện tại (ảnh lớn, giữ nguyên) + ảnh tổng quan tài khoản (bảng thông tin nhỏ, nếu có)
  // hiển thị cạnh nhau ở trên cùng — nạp trước để tính chiều cao khung theo đúng tỉ lệ thật, không cắt xén
  let heroImg = null, overviewImg = null, heroH = 0;
  const hasOverview = !!state.overviewImg;
  const hasHero = !!state.gridHeroImg;
  if (hasHero){ try{ heroImg = await loadImg(state.gridHeroImg); }catch(e){} }
  if (hasOverview){ try{ overviewImg = await loadImg(state.overviewImg); }catch(e){} }

  // tỉ lệ cột: nếu có cả 2 ảnh, ảnh tổng quan (bảng thông tin) chiếm ~32% bề rộng, ảnh acc chính chiếm phần còn lại
  const ovW = (hasOverview && hasHero) ? Math.round(innerW * 0.32) : innerW;
  const heroW = (hasOverview && hasHero) ? (innerW - ovW - gap) : innerW;
  if (heroImg){
    const natural = heroW * (heroImg.height / heroImg.width);
    heroH = Math.round(Math.min(Math.max(natural, W*0.32), W*0.95));
  }
  if (overviewImg && !heroImg){
    const natural = innerW * (overviewImg.height / overviewImg.width);
    heroH = Math.round(Math.min(Math.max(natural, W*0.32), W*0.95));
  } else if (overviewImg && heroImg){
    // ép ảnh tổng quan theo cùng chiều cao với ảnh acc chính để 2 khung thẳng hàng
    heroH = heroH;
  }

  const H = pad + heroH + heroGap + gridH + pad + bottomBar;
  canvas.width = W; canvas.height = H;
  canvasWrap.classList.add("auto-h", "grid-mode");

  ctx.clearRect(0,0,W,H);

  // nền
  const bgGrad = ctx.createLinearGradient(0,0,0,H);
  bgGrad.addColorStop(0, cfg.theme.surfaceAlt);
  bgGrad.addColorStop(1, cfg.theme.bg);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0,0,W,H);

  let gridTop = pad;

  function drawRoundedBox(x, y, w, h, rad, img){
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x+rad, y);
    ctx.arcTo(x+w, y, x+w, y+h, rad);
    ctx.arcTo(x+w, y+h, x, y+h, rad);
    ctx.arcTo(x, y+h, x, y, rad);
    ctx.arcTo(x, y, x+w, y, rad);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = cfg.theme.surface;
    ctx.fillRect(x, y, w, h);
    if (img) drawContain(ctx, img, x, y, w, h); // không cắt xén ảnh
    ctx.restore();
    ctx.strokeStyle = cfg.theme.primary;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
  }

  if (heroImg || overviewImg){
    if (overviewImg && heroImg){
      // ảnh tổng quan (bảng thông tin nhỏ) bên trái, ảnh acc chính (lớn) bên phải — như ảnh mẫu
      drawRoundedBox(pad, pad, ovW, heroH, 12, overviewImg);
      drawRoundedBox(pad + ovW + gap, pad, heroW, heroH, 12, heroImg);
    } else if (heroImg){
      drawRoundedBox(pad, pad, innerW, heroH, 12, heroImg);
    } else if (overviewImg){
      drawRoundedBox(pad, pad, innerW, heroH, 12, overviewImg);
    }
    gridTop = pad + heroH + heroGap;
  }

  const absItems = [];
  for (const g of gridItems){
    const i = g.index, item = g.item;
    const x = pad + g.x, y = gridTop + g.y, cw = g.w, ch = g.h;
    absItems.push({ index: i, x, y, w: cw, h: ch });
    const picked = (i === state.gridSwapPick);
    const hover = (i === highlightIndex);
    try{
      const img = await loadImg(item.url);
      ctx.save();
      const rad = 8;
      ctx.beginPath();
      ctx.moveTo(x+rad, y);
      ctx.arcTo(x+cw, y, x+cw, y+ch, rad);
      ctx.arcTo(x+cw, y+ch, x, y+ch, rad);
      ctx.arcTo(x, y+ch, x, y, rad);
      ctx.arcTo(x, y, x+cw, y, rad);
      ctx.closePath();
      ctx.clip();
      // ô có đúng tỉ lệ ảnh gốc nên ảnh lấp đầy vừa khít, không cần vẽ nền (không viền trắng thừa)
      ctx.drawImage(img, x, y, cw, ch);
      ctx.restore();
      ctx.strokeStyle = (picked || hover) ? cfg.theme.accent : cfg.theme.border;
      ctx.lineWidth = (picked || hover) ? 3 : 1.5;
      ctx.strokeRect(x, y, cw, ch);

      // ảnh bậc/hạng do admin lưu khi thêm skin — huy hiệu nhỏ góc trên trái, cũng giữ nguyên không cắt
      if (item.rankImage){
        try{
          const rankImg = await loadImg(item.rankImage);
          const rw = Math.min(cw, ch) * 0.34;
          const rh = rw * (rankImg.height / rankImg.width);
          drawContain(ctx, rankImg, x+4, y+4, rw, Math.max(rh, rw*0.4));
        }catch(e){}
      }

      // số thứ tự nhỏ góc dưới trái, giống thẻ ảnh gốc
      ctx.fillStyle = "#0009";
      ctx.fillRect(x+4, y+ch-20, 20, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(i+1), x+14, y+ch-8);

      // tên skin in chữ thường, không khung, ngay dưới ảnh
      if (item.name){
        ctx.font = "600 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = cfg.theme.text;
        const label = truncateToWidth(ctx, item.name, cw - 6);
        ctx.fillText(label, x + cw/2, y + ch + nameH - 6);
      }
    }catch(e){}
  }

  // viền ngoài tổng thể quanh lưới
  ctx.strokeStyle = cfg.theme.primary;
  ctx.lineWidth = 3;
  ctx.strokeRect(pad, gridTop, innerW, gridH);

  // watermark
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = cfg.theme.accent;
  ctx.fillText("MIỄN PHÍ · " + cfg.siteName, W-pad, H-14);

  state.lastGridLayout = { items: absItems, n, canvasW: W, canvasH: H };
  return true;
}

async function generateGridComposite(){
  const n = state.gridImages.length;
  if (n < 2){
    toast("Hãy thêm ít nhất 2 ảnh để ghép lưới nhé");
    return;
  }
  state.gridSwapPick = null;
  const canvas = document.getElementById("resultCanvas");
  const ok = await renderGridComposite(null);
  if (!ok) return;
  finalizeResult(canvas, `Đã ghép ${n} ảnh thành 1 ảnh lưới — bấm trực tiếp vào 2 ảnh để đổi chỗ nếu muốn ✨`);
}

/* bấm trực tiếp vào ảnh đã ghép để đổi chỗ 2 ảnh cho nhau */
function setupGridSwapClicks(){
  const canvas = document.getElementById("resultCanvas");
  if (!canvas || canvas._swapWired) return;
  canvas._swapWired = true;
  canvas.addEventListener("click", async (e)=>{
    const layout = state.lastGridLayout;
    if (!layout) return; // chưa ghép lưới lần nào thì bỏ qua
    const rect = canvas.getBoundingClientRect();
    const scaleX = layout.canvasW / rect.width, scaleY = layout.canvasH / rect.height;
    const cx = (e.clientX - rect.left) * scaleX, cy = (e.clientY - rect.top) * scaleY;
    // mỗi ảnh giờ có kích thước riêng (hàng cân chiều cao) nên dò ô bằng cách kiểm tra điểm bấm
    // có rơi vào đúng hình chữ nhật của ảnh nào trong danh sách layout đã lưu hay không
    const hit = layout.items.find(it => cx >= it.x && cx <= it.x + it.w && cy >= it.y && cy <= it.y + it.h);
    if (!hit) return;
    const idx = hit.index;

    if (state.gridSwapPick === null){
      state.gridSwapPick = idx;
      await renderGridComposite(idx);
      toast(`Đã chọn ảnh #${idx+1} — bấm vào ảnh còn lại để đổi chỗ`);
    } else if (state.gridSwapPick === idx){
      state.gridSwapPick = null;
      await renderGridComposite(null);
    } else {
      const a = state.gridSwapPick, b = idx;
      [state.gridImages[a], state.gridImages[b]] = [state.gridImages[b], state.gridImages[a]];
      state.gridSwapPick = null;
      await renderGridComposite(null);
      const canvasEl = document.getElementById("resultCanvas");
      const dataUrl = canvasEl.toDataURL("image/png");
      const hist = loadHistory();
      hist.unshift({ url: dataUrl, ts: Date.now() });
      saveHistory(hist);
      renderHistory();
      toast(`Đã đổi chỗ ảnh #${a+1} và #${b+1} ✅`);
    }
  });
}

function renderHistory(){
  const list = document.getElementById("historyList");
  const hist = loadHistory();
  if (!hist.length){
    list.innerHTML = `<div class="history__empty">Các ảnh mới ghép sẽ xuất hiện ở đây</div>`;
    return;
  }
  list.innerHTML = hist.map(h => `<div class="history__item"><img src="${h.url}" alt="ghep"></div>`).join("");
}

/* ---------- init ---------- */
function init(){
  applyTheme(cfg);
  renderBrand();
  renderWidgets();
  renderHistory();

  document.getElementById("generateBtn").addEventListener("click", generateComposite);
  document.getElementById("downloadBtn").addEventListener("click", ()=>{
    const canvas = document.getElementById("resultCanvas");
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "ghep-anh-lien-quan.png";
    a.click();
  });
  document.getElementById("clearHistBtn").addEventListener("click", ()=>{
    saveHistory([]);
    renderHistory();
    toast("Đã xoá lịch sử ghép");
  });

  // live-refresh if admin updates config or skin library in another tab
  window.addEventListener("storage", (e)=>{
    if (e.key === CONFIG_KEY){
      cfg = loadConfig();
      applyTheme(cfg);
      renderBrand();
      renderWidgets();
    }
    if (e.key === LIBRARY_KEY){
      if (document.getElementById("skinGrid")) setupSkinPicker();
      if (document.getElementById("heroDisplayGrid")) setupHeroDisplayPicker();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
