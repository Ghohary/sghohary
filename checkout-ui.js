(() => {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const form = $("checkoutForm");
    const globalError = $("checkout-errors");

    const fields = [
        { id: "email", required: true, validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Please enter a valid email address.") },
        { id: "firstName", required: true, validate: (v) => (v ? "" : "First name is required.") },
        { id: "lastName", required: true, validate: (v) => (v ? "" : "Last name is required.") },
        { id: "phone", required: true, validate: (v) => (v ? "" : "Phone number is required.") },
        { id: "country", required: true, validate: (v) => (v ? "" : "Please choose your country.") },
        { id: "address", required: true, validate: (v) => (v ? "" : "Street address is required.") },
        { id: "city", required: true, validate: (v) => (v ? "" : "City is required.") },
        { id: "zip", required: true, validate: (v) => (v ? "" : "Postal code is required.") }
    ];

    function setError(field, message) {
        var wrapper = field.closest(".form-group");
        var errorEl = $(field.id + "-error");
        if (!wrapper || !errorEl) return;
        wrapper.classList.toggle("has-error", Boolean(message));
        errorEl.textContent = message || "";
        field.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function validateOne(field) {
        var config = fields.find(function(f) { return f.id === field.id; });
        if (!config) { setError(field, ""); return true; }
        var value = String(field.value || "").trim();
        if (config.required && !value) {
            var label = field.previousElementSibling;
            setError(field, (label ? label.textContent.replace(/\s*\*\s*$/, '') : "This field") + " is required.");
            return false;
        }
        if (config.validate) {
            var msg = config.validate(value);
            if (msg) { setError(field, msg); return false; }
        }
        setError(field, "");
        return true;
    }

    function validateForm() {
        var firstInvalid = null;
        var ok = true;
        fields.forEach(function(f) {
            var el = $(f.id);
            if (!el) return;
            var valid = validateOne(el);
            if (!valid && !firstInvalid) firstInvalid = el;
            ok = ok && valid;
        });
        if (!ok && firstInvalid) firstInvalid.focus({ preventScroll: false });
        if (!ok && globalError) globalError.textContent = "Please review the highlighted fields.";
        else if (globalError) globalError.textContent = "";
        return ok;
    }

    // Real-time validation on input and blur
    if (form) {
        form.addEventListener("input", function(e) {
            if (e.target && e.target.id && $(e.target.id)) validateOne(e.target);
        });
        form.addEventListener("blur", function(e) {
            if (e.target && e.target.id && $(e.target.id)) validateOne(e.target);
        }, true);
    }

    // Mobile summary toggle
    var toggle = $("checkoutSummaryToggle");
    var panel = $("checkoutSummaryPanel");
    if (toggle && panel) {
        panel.hidden = true;
        toggle.addEventListener("click", function() {
            var expanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!expanded));
            panel.hidden = expanded;
        });
    }

    // Sticky submit button triggers form submit
    var stickyBtn = $("checkoutSubmitSticky");
    if (stickyBtn && form) {
        stickyBtn.addEventListener("click", function() {
            if (typeof form.requestSubmit === "function") form.requestSubmit();
            else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        });
    }

    // Expose validateForm globally so checkout.js can use it
    window.checkoutUIValidate = validateForm;
})();
