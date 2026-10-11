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
  function mount(el) {
    var slug = el.getAttribute("data-sendfable-form");
    if (!slug || el.getAttribute("data-sendfable-ready")) return;
    el.setAttribute("data-sendfable-ready", "1");
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
          }).catch(function () {
            button.disabled = false;
            error.textContent = "Something went wrong";
          });
        });
        el.appendChild(box);
      })
      .catch(function () {
        el.textContent = "This form is unavailable.";
      });
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
