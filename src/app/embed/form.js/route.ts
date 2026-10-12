import { NextResponse } from "next/server";

const SCRIPT = `
(function () {
  var script = document.currentScript;
  var origin = script && script.src ? new URL(script.src).origin : "https://sendfable.com";
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  function fieldInput(field) {
    var wrap = document.createElement("label");
    wrap.style.display = "block";
    wrap.style.margin = "0 0 12px";
    var name = document.createElement("span");
    name.textContent = field.label + (field.required ? " *" : "");
    name.style.display = "block";
    name.style.marginBottom = "4px";
    name.style.fontSize = "0.9rem";
    var input = document.createElement("input");
    input.name = field.key;
    input.required = !!field.required;
    input.autocomplete = field.key === "email" ? "email" : field.key === "phone" ? "tel" : "on";
    input.type = field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text";
    input.style.cssText = "width:100%;box-sizing:border-box;font:inherit;color:inherit;background:transparent;border:1px solid color-mix(in srgb, currentColor 35%, transparent);border-radius:8px;padding:0.6rem 0.75rem;";
    wrap.appendChild(name);
    wrap.appendChild(input);
    return wrap;
  }
  function track(slug, type, display) {
    fetch(origin + "/api/forms/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: slug, type: type, display: display }),
      keepalive: true,
      mode: "cors"
    }).catch(function () {});
  }
  function popupConfig(el) {
    if (el.getAttribute("data-display") !== "popup") return null;
    var trigger = el.getAttribute("data-trigger") === "scroll" ? "scroll" : "delay";
    var delay = parseInt(el.getAttribute("data-delay") || "10", 10);
    if ([5, 10, 20, 30].indexOf(delay) < 0) delay = 10;
    var scroll = parseInt(el.getAttribute("data-scroll") || "50", 10);
    if ([25, 50, 75].indexOf(scroll) < 0) scroll = 50;
    var frequency = el.getAttribute("data-frequency") || "7d";
    if (["once", "7d", "30d"].indexOf(frequency) < 0) frequency = "7d";
    return { trigger: trigger, delay: delay, scroll: scroll, frequency: frequency };
  }
  function frequencyAllows(slug, frequency) {
    try {
      var raw = localStorage.getItem("sf-popup:" + slug);
      if (!raw) return true;
      var at = parseInt(raw, 10);
      if (!at) return true;
      if (frequency === "once") return false;
      var days = frequency === "30d" ? 30 : 7;
      return Date.now() - at >= days * 86400000;
    } catch (err) {
      return true;
    }
  }
  function markShown(slug) {
    try { localStorage.setItem("sf-popup:" + slug, String(Date.now())); } catch (err) {}
  }
  function openPopup(slug, draw) {
    var backdrop = document.createElement("div");
    backdrop.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(28,25,23,0.45);display:flex;align-items:flex-end;justify-content:center;padding:16px;box-sizing:border-box;overflow:auto;";
    if (window.innerWidth >= 640) backdrop.style.alignItems = "center";
    var dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Signup");
    dialog.style.cssText = "position:relative;width:100%;max-width:28rem;max-height:min(90vh,640px);overflow:auto;background:#fff;color:#1c1917;border-radius:16px;padding:48px 16px 16px;box-sizing:border-box;";
    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.textContent = "Close";
    close.style.cssText = "position:absolute;top:8px;right:8px;min-width:44px;min-height:44px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;";
    var slot = document.createElement("div");
    dialog.appendChild(close);
    dialog.appendChild(slot);
    backdrop.appendChild(dialog);
    var previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.appendChild(backdrop);
    draw(slot);
    function nodes() {
      return Array.prototype.filter.call(dialog.querySelectorAll("button, input, a, textarea, select"), function (node) {
        return !node.disabled && node.getAttribute("aria-hidden") !== "true";
      });
    }
    function finish(closed) {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      if (closed) track(slug, "popup_closed", "popup");
    }
    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(true);
        return;
      }
      if (event.key !== "Tab") return;
      var list = nodes();
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    close.addEventListener("click", function () { finish(true); });
    backdrop.addEventListener("click", function (event) {
      if (event.target === backdrop) finish(true);
    });
    close.focus();
    markShown(slug);
    track(slug, "popup_shown", "popup");
  }
  function mount(el) {
    var slug = el.getAttribute("data-sendfable-form");
    if (!slug || el.getAttribute("data-sendfable-ready")) return;
    el.setAttribute("data-sendfable-ready", "1");
    var popup = popupConfig(el);
    var display = popup ? "popup" : "inline";
    if (popup && !frequencyAllows(slug, popup.frequency)) return;
    if (popup) el.style.display = "none";
    function begin() {
    fetch(origin + "/api/forms/public/" + encodeURIComponent(slug))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || data.unavailable || !data.form) {
          el.textContent = (data && data.message) || "This form is not accepting submissions right now.";
          return;
        }
        var form = data.form;
        var theme = el.getAttribute("data-theme") || form.theme || "inherit";
        var box = document.createElement("form");
        box.className = "sendfable-form theme-" + theme;
        box.setAttribute("novalidate", "novalidate");
        box.style.cssText = "font:inherit;color:inherit;max-width:28rem;";
        (form.fields || []).forEach(function (field) {
          if (field.key === "smsConsent") return;
          box.appendChild(fieldInput(field));
        });
        if ((form.fields || []).some(function (field) { return field.key === "email"; })) {
          var note = document.createElement("p");
          note.textContent = form.emailConsentText;
          note.style.cssText = "font-size:0.8rem;opacity:0.75;margin:0 0 12px;";
          box.appendChild(note);
        }
        var sms = null;
        if (form.smsConsentEnabled) {
          var smsLabel = document.createElement("label");
          smsLabel.style.cssText = "display:flex;gap:8px;align-items:flex-start;font-size:0.85rem;margin:0 0 12px;";
          sms = document.createElement("input");
          sms.type = "checkbox";
          sms.name = "smsConsent";
          sms.style.marginTop = "0.2rem";
          var smsText = document.createElement("span");
          smsText.textContent = form.smsConsentDisclosure + " Optional — not required to submit. Unchecked by default. Email signup does not imply SMS consent.";
          smsLabel.appendChild(sms);
          smsLabel.appendChild(smsText);
          box.appendChild(smsLabel);
        }
        var hp = document.createElement("input");
        hp.name = "sf_hp";
        hp.tabIndex = -1;
        hp.autocomplete = "off";
        hp.setAttribute("aria-hidden", "true");
        hp.style.cssText = "position:absolute;left:-9999px;height:0;width:0;opacity:0;";
        box.appendChild(hp);
        var error = document.createElement("p");
        error.style.cssText = "color:#b91c1c;font-size:0.85rem;min-height:1.2em;margin:0 0 8px;";
        box.appendChild(error);
        var button = document.createElement("button");
        button.type = "submit";
        button.textContent = form.buttonLabel || "Subscribe";
        if (theme === "inherit") {
          button.style.cssText = "font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:8px;padding:0.7rem 1rem;cursor:pointer;width:100%;";
        } else {
          button.style.cssText = "font:inherit;color:#fff;background:" + (form.primaryColor || "#1B4332") + ";border:0;border-radius:8px;padding:0.7rem 1rem;cursor:pointer;width:100%;";
        }
        box.appendChild(button);
        if (form.showSendfableBadge) {
          var credit = document.createElement("p");
          credit.style.cssText = "margin:10px 0 0;font-size:12px;line-height:1.35;opacity:0.8;";
          var creditLink = document.createElement("a");
          var medium = display === "popup" ? "popup" : "embed_badge";
          var badgeQuery = "utm_source=signup_tool&utm_medium=" + medium + "&utm_campaign=free_plan&utm_content=" + encodeURIComponent(form.hostedSlug || slug) + "&utm_term=" + display;
          if (form.referralCode) badgeQuery = "ref=" + encodeURIComponent(form.referralCode) + "&" + badgeQuery;
          creditLink.href = origin + "/signup?" + badgeQuery;
          creditLink.addEventListener("click", function () { track(slug, "badge_clicked", display); });
          creditLink.target = "_blank";
          creditLink.rel = "noopener";
          creditLink.textContent = "Powered by SendFable";
          var creditLine = document.createElement("span");
          creditLine.textContent = "We turn your content into emails ready to send.";
          creditLine.style.cssText = "display:block;margin-top:2px;font-size:11px;opacity:0.75;";
          credit.appendChild(creditLink);
          credit.appendChild(creditLine);
          box.appendChild(credit);
        }
        var started = false;
        box.addEventListener("input", function () {
          if (started) return;
          started = true;
          track(slug, "form_started", display);
        });
        box.addEventListener("submit", function (event) {
          event.preventDefault();
          error.textContent = "";
          var fields = {};
          Array.prototype.forEach.call(box.elements, function (node) {
            if (!node.name || node.type === "submit") return;
            fields[node.name] = node.type === "checkbox" ? node.checked : node.value;
          });
          var params = new URLSearchParams(window.location.search);
          button.disabled = true;
          fetch(origin + "/api/forms/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug: slug,
              token: data.token,
              fields: fields,
              attribution: {
                pageUrl: window.location.href,
                referrer: document.referrer || undefined,
                utmSource: params.get("utm_source") || undefined,
                utmMedium: params.get("utm_medium") || undefined,
                utmCampaign: params.get("utm_campaign") || undefined
              }
            })
          }).then(function (res) {
            return res.json().then(function (body) { return { ok: res.ok, body: body }; });
          }).then(function (result) {
            button.disabled = false;
            if (!result.ok) {
              error.textContent = (result.body && result.body.error) || "Something went wrong";
              return;
            }
            box.innerHTML = "";
            var title = document.createElement("p");
            title.style.fontWeight = "600";
            title.textContent = result.body.pendingConfirm ? "Check your email" : (form.successMessage || "You're subscribed");
            box.appendChild(title);
            track(slug, "form_submitted", display);
          }).catch(function () {
            button.disabled = false;
            error.textContent = "Something went wrong";
          });
        });
        if (display === "popup") openPopup(slug, function (slot) { slot.appendChild(box); });
        else el.appendChild(box);
      })
      .catch(function () {
        if (display !== "popup") el.textContent = "This form is unavailable.";
      });
    }
    if (!popup) begin();
    else if (popup.trigger === "scroll") {
      function onScroll() {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        var pct = max <= 0 ? 0 : (window.scrollY / max) * 100;
        if (pct >= popup.scroll) {
          window.removeEventListener("scroll", onScroll);
          begin();
        }
      }
      window.addEventListener("scroll", onScroll, { passive: true });
    } else {
      window.setTimeout(begin, popup.delay * 1000);
    }
  }
  ready(function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-sendfable-form]"), mount);
  });
})();
`;

export function GET() {
  return new NextResponse(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
