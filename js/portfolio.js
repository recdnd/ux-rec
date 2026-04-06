/**
 * ux.rec.ooo — load data/cards.json, render rail + display.
 * Stable video flow: reset -> set src -> loadedmetadata (ratio) -> canplay (play).
 */

(function () {
  "use strict";

  const DATA_URL = "data/cards.json";

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function normalizeCards(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(function (c) {
        return c && c.featured === true && c.id;
      })
      .sort(function (a, b) {
        var oa = typeof a.order === "number" ? a.order : 999;
        var ob = typeof b.order === "number" ? b.order : 999;
        return oa - ob;
      })
      .map(function (item) {
        var media = item.media && typeof item.media === "object" ? item.media : {};
        return Object.assign({}, item, {
          resolvedMedia: {
            type: "video",
            src: "movies/" + String(item.id) + ".mp4",
            poster: media.poster ? String(media.poster) : "",
            alt: media.alt ? String(media.alt) : String(item.title || "Preview"),
          },
        });
      });
  }

  function rolesLine(item) {
    if (!Array.isArray(item.role) || item.role.length === 0) return "";
    return item.role
      .map(function (r) {
        return esc(r);
      })
      .join('<span class="rec-card__role-gap"> · </span>');
  }

  function productYearLine(item) {
    var p = item.product ? String(item.product) : "";
    var y = item.year ? String(item.year) : "";
    if (!p && !y) return "";
    if (p && y) return esc(p) + " · " + esc(y);
    return esc(p || y);
  }

  function buildDetailInner(item) {
    var d = item.detail;
    if (!d || typeof d !== "object") {
      return "";
    }
    var rows = [
      { label: "Problem", text: d.problem },
      { label: "Design move", text: d.designMove },
      { label: "Outcome", text: d.outcome },
    ];
    return rows
      .map(function (row) {
        if (!row.text) return "";
        return (
          '<section class="rec-card__detail-sect">' +
          '<h3 class="rec-card__detail-label">' +
          esc(row.label) +
          "</h3>" +
          '<p class="rec-card__detail-text">' +
          esc(row.text) +
          "</p>" +
          "</section>"
        );
      })
      .join("");
  }

  function resetMonitorShape(displayEl) {
    displayEl.removeAttribute("data-orientation");
    displayEl.style.setProperty("--rec-monitor-ratio", "16 / 10");
    displayEl.style.setProperty("--rec-monitor-max-width", "100%");
  }

  function applyMonitorRatio(videoEl, displayEl) {
    var w = videoEl.videoWidth;
    var h = videoEl.videoHeight;
    if (!w || !h) return;
    var ratio = w / h;
    displayEl.style.setProperty("--rec-monitor-ratio", w + " / " + h);
    if (ratio < 1) {
      displayEl.setAttribute("data-orientation", "portrait");
      displayEl.style.setProperty("--rec-monitor-max-width", "420px");
    } else {
      displayEl.setAttribute("data-orientation", "landscape");
      displayEl.style.setProperty("--rec-monitor-max-width", "100%");
    }
    console.log("[video metadata]", w, h);
  }

  function prepareVideoElement(videoEl) {
    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.playsInline = true;
    videoEl.autoplay = true;
    videoEl.loop = true;
    videoEl.setAttribute("muted", "");
    videoEl.setAttribute("playsinline", "");
    videoEl.setAttribute("webkit-playsinline", "");
    videoEl.setAttribute("autoplay", "");
    videoEl.setAttribute("loop", "");
  }

  function renderCards(cases, rail, display) {
    rail.textContent = "";
    var videoEl = display.querySelector(".rec-display__video");
    var imageEl = display.querySelector(".rec-display__image");
    var placeholderEl = display.querySelector(".rec-display__placeholder");
    var placeholderText = placeholderEl.querySelector(".rec-display__placeholder-text");
    var captionEl = display.querySelector(".rec-display__caption");

    var currentIndex = -1;
    var videoLoadGeneration = 0;

    function hideAllMedia() {
      videoEl.pause();
      videoEl.hidden = true;
      videoEl.removeAttribute("src");
      videoEl.removeAttribute("poster");
      videoEl.removeAttribute("aria-label");
      videoEl.removeAttribute("title");
      videoEl.removeAttribute("autoplay");
      videoEl.removeAttribute("loop");
      imageEl.hidden = true;
      imageEl.removeAttribute("src");
      imageEl.alt = "";
      placeholderEl.hidden = true;
      if (placeholderText) placeholderText.textContent = "";
    }

    function setIdleMonitor() {
      currentIndex = -1;
      hideAllMedia();
      resetMonitorShape(display);
      placeholderEl.hidden = false;
      if (placeholderText) {
        placeholderText.textContent = "Preview monitor idle.";
      }
      captionEl.textContent = "SELECT A CASE";
      display.setAttribute("data-idle", "true");
      display.setAttribute(
        "aria-label",
        "Preview monitor."
      );
      setPlayingIndex(-1);
    }

    function setPlayingIndex(playingIndex) {
      rail.querySelectorAll(".rec-card").forEach(function (el) {
        var idx = parseInt(el.getAttribute("data-case-index"), 10);
        var on = playingIndex >= 0 && idx === playingIndex;
        el.setAttribute("data-playing", on ? "true" : "false");
      });
    }

    function showVideoMedia(videoEl, displayEl, media, captionText) {
      var gen = ++videoLoadGeneration;
      resetMonitorShape(displayEl);
      prepareVideoElement(videoEl);

      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();

      hideAllMedia();
      videoEl.hidden = false;
      videoEl.setAttribute("aria-label", media.alt || "Preview");
      if (media.poster) {
        videoEl.setAttribute("poster", media.poster);
      } else {
        videoEl.removeAttribute("poster");
      }

      var handleMetadata = function () {
        if (gen !== videoLoadGeneration) return;
        applyMonitorRatio(videoEl, displayEl);
      };
      var handleCanPlay = function () {
        if (gen !== videoLoadGeneration) return;
        videoEl.play().catch(function (err) {
          console.warn("Video play failed:", media.src, err);
        });
      };
      var handleError = function () {
        if (gen !== videoLoadGeneration) return;
        console.error("Video load failed:", media.src);
      };

      videoEl.addEventListener("loadedmetadata", handleMetadata, { once: true });
      videoEl.addEventListener("canplay", handleCanPlay, { once: true });
      videoEl.addEventListener("error", handleError, { once: true });

      videoEl.src = media.src;
      videoEl.load();

      captionEl.textContent = captionText || "—";
      displayEl.setAttribute("data-idle", "false");
      displayEl.setAttribute("aria-label", "Preview monitor. Click for next case.");
    }

    videoEl.addEventListener("error", function () {
      if (videoEl.hasAttribute("hidden")) return;
      var err = videoEl.error;
      var code = err ? err.code : 0;
      var line =
        "Expected file at this URL (serve site over HTTP, not file://).";
      var cap = "VIDEO ERROR";
      if (code === 2) {
        cap = "NETWORK — 404 OR PATH";
        line =
          "Confirm movies/*.mp4 exists next to index.html and URL is correct.";
      } else if (code === 3) {
        cap = "DECODE ERROR";
        line = "File may be corrupt or truncated.";
      } else if (code === 4) {
        cap = "CODEC NOT SUPPORTED";
        line =
          "Use MP4 with H.264 video + AAC audio (e.g. ffmpeg -c:v libx264 -c:a aac).";
      }
      console.warn("[rec-display] video error", code, videoEl.currentSrc || videoEl.src);
      captionEl.textContent = cap;
      placeholderEl.hidden = false;
      if (placeholderText) {
        placeholderText.textContent = line;
      }
      videoEl.setAttribute("hidden", "");
      videoEl.pause();
    });

    function playCaseByIndex(index) {
      if (index < 0 || index >= cases.length) return;
      currentIndex = index;
      var item = cases[index];
      var media = item.resolvedMedia || {};
      console.log("[playCaseByIndex]", index, item.id, media.src);

      showVideoMedia(videoEl, display, media, item.title ? String(item.title) : "—");
      setPlayingIndex(index);
    }

    function nextChannel() {
      if (cases.length === 0) return;
      if (currentIndex < 0) return;
      playCaseByIndex((currentIndex + 1) % cases.length);
    }

    function onMonitorActivate(e) {
      if (currentIndex < 0) return;
      if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
      if (e.type === "keydown") e.preventDefault();
      nextChannel();
    }

    display.addEventListener("click", function (e) {
      if (e.target.closest("a, button")) return;
      if (currentIndex < 0) return;
      nextChannel();
    });

    display.addEventListener("keydown", onMonitorActivate);

    cases.forEach(function (item, index) {
      var card = document.createElement("article");
      card.className = "rec-card";
      card.setAttribute("role", "listitem");
      card.setAttribute("data-case-id", item.id);
      card.setAttribute("data-case-index", String(index));
      card.setAttribute("data-playing", "false");
      card.setAttribute("data-collapsed", "false");

      var ctx = productYearLine(item);
      var rolesHtml = rolesLine(item);
      var detailInner = buildDetailInner(item);

      var metaHtml = "";
      if (rolesHtml || ctx) {
        metaHtml =
          '<div class="rec-card__meta">' +
          (rolesHtml ? '<p class="rec-card__roles">' + rolesHtml + "</p>" : "") +
          (ctx ? '<p class="rec-card__ctx">' + ctx + "</p>" : "") +
          "</div>";
      }

      var stackHtml =
        '<div class="rec-card__stack">' +
        '<p class="rec-card__statement">' +
        esc(item.statement || "") +
        "</p>" +
        (item.summary
          ? '<p class="rec-card__summary">' + esc(item.summary) + "</p>"
          : "") +
        (detailInner
          ? '<div class="rec-card__detail">' + detailInner + "</div>"
          : "") +
        metaHtml +
        "</div>";

      card.innerHTML =
        '<h2 class="rec-card__title">' +
        esc(item.title) +
        "</h2>" +
        stackHtml +
        '<div class="rec-card__controls">' +
        '<button type="button" class="rec-card__toggle" aria-expanded="true" aria-label="Collapse panel">−</button>' +
        '<button type="button" class="rec-card__play">▶</button>' +
        "</div>";

      var toggleBtn = card.querySelector(".rec-card__toggle");
      var playBtn = card.querySelector(".rec-card__play");
      playBtn.setAttribute(
        "aria-label",
        "Play " + String(item.title || "case")
      );

      function setCollapsed(collapsed) {
        card.setAttribute("data-collapsed", collapsed ? "true" : "false");
        toggleBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
        toggleBtn.textContent = collapsed ? "+" : "−";
        toggleBtn.setAttribute(
          "aria-label",
          collapsed ? "Expand panel" : "Collapse panel"
        );
      }

      toggleBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var collapsed = card.getAttribute("data-collapsed") === "true";
        setCollapsed(!collapsed);
      });

      playBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        playCaseByIndex(index);
      });

      card.addEventListener("click", function (e) {
        if (e.target.closest(".rec-card__toggle") || e.target.closest(".rec-card__play")) return;
        playCaseByIndex(index);
      });

      rail.appendChild(card);
    });

    var ghostIndex = cases.findIndex(function (c) {
      return c.id === "ghostwriting";
    });
    if (ghostIndex >= 0) {
      playCaseByIndex(ghostIndex);
    } else {
      setIdleMonitor();
    }
  }

  function init() {
    var rail = document.getElementById("rec-rail");
    var display = document.getElementById("rec-display");
    if (!rail || !display) return;

    fetch(DATA_URL)
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (raw) {
        var cases = normalizeCards(raw);
        if (cases.length === 0) {
          rail.innerHTML =
            '<p class="rec-empty">No featured cards in data/cards.json.</p>';
          return;
        }
        renderCards(cases, rail, display);
      })
      .catch(function () {
        rail.innerHTML =
          '<p class="rec-empty">Could not load data/cards.json. Serve this folder over HTTP (e.g. python3 -m http.server).</p>';
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
