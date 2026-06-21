/* @ds-bundle: {"format":3,"namespace":"AstroDesignSystem_424d7f","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"SectionHeader","sourcePath":"components/data-display/SectionHeader.jsx"},{"name":"Sheet","sourcePath":"components/data-display/Sheet.jsx"},{"name":"StatusPill","sourcePath":"components/data-display/StatusPill.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"FilterPills","sourcePath":"components/forms/FilterPills.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"466bf1604f27","components/core/Badge.jsx":"585cae8c777b","components/core/Button.jsx":"fa6fc0e16e70","components/core/Icon.jsx":"d166d9facf1f","components/data-display/SectionHeader.jsx":"6daf5845d6e7","components/data-display/Sheet.jsx":"2c8235192fc0","components/data-display/StatusPill.jsx":"5659efcee791","components/forms/Field.jsx":"f7b9216a5dce","components/forms/FilterPills.jsx":"52bae3919f0c","components/forms/Switch.jsx":"acf9f43ba1e6","ui_kits/app/AppShell.jsx":"d78ca5b0c89a","ui_kits/app/Appointments.jsx":"6637e4861eaa","ui_kits/app/Customers.jsx":"e7ee7ace2073","ui_kits/app/Dashboard.jsx":"999c2910c450","ui_kits/app/Reminders.jsx":"4d967160980b","ui_kits/marketing/Booking.jsx":"186f42c514db","ui_kits/marketing/FeatureRows.jsx":"cab28d46954b","ui_kits/marketing/HowItWorks.jsx":"86d81fb4ddc5","ui_kits/marketing/MarketingClose.jsx":"6e96e19dc1d3","ui_kits/marketing/MarketingHero.jsx":"0ed5b2ce1b83","ui_kits/marketing/MarketingNav.jsx":"bb6088a0d196","ui_kits/marketing/Pricing.jsx":"b059e08d9a9f"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AstroDesignSystem_424d7f = window.AstroDesignSystem_424d7f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TIER_BG = {
  top: "var(--al-gradient-avatar-top)",
  risk: "var(--al-gradient-avatar-std)",
  neutral: "var(--al-surface-container)"
};
const TIER_FG = {
  top: "var(--al-primary)",
  risk: "var(--al-tertiary-container)",
  neutral: "var(--al-on-surface-variant)"
};

/**
 * Avatar — initials on a tier-colored gradient. No photography by default;
 * pass `src` for a real image. Top tier = navy gradient, risk = terracotta.
 */
function Avatar({
  initials,
  src,
  tier = "neutral",
  size = 40,
  className = "",
  style = {},
  ...rest
}) {
  const base = {
    width: size,
    height: size,
    borderRadius: 9999,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    fontFamily: "var(--al-font)",
    fontSize: Math.round(size * 0.34),
    fontWeight: 800,
    letterSpacing: "0.04em",
    background: TIER_BG[tier] || TIER_BG.neutral,
    color: TIER_FG[tier] || TIER_FG.neutral,
    ...style
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: base
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VARIANTS = {
  primary: {
    background: "var(--al-primary)",
    color: "var(--al-on-primary)"
  },
  secondary: {
    background: "var(--al-secondary-container)",
    color: "var(--al-on-secondary-container)"
  },
  curator: {
    background: "var(--al-secondary-fixed)",
    color: "var(--al-on-secondary-fixed)"
  },
  muted: {
    background: "var(--al-surface-container)",
    color: "var(--al-on-surface-variant)"
  },
  outline: {
    background: "transparent",
    color: "var(--al-on-surface-variant)",
    border: "1px solid var(--al-outline-variant)"
  }
};

/**
 * Badge — small pill label. `curator` is the signature filter/category chip
 * (terracotta-fixed); `muted` for counts; `outline` for quiet metadata.
 */
function Badge({
  children,
  variant = "muted",
  className = "",
  style = {},
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.muted;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 9999,
      fontFamily: "var(--al-font)",
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.01em",
      border: v.border || "1px solid transparent",
      ...v,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Icon — Material Symbols Outlined glyph, the entire Astro icon vocabulary.
 * FILL 0 by default; set `fill` to render the active/emphasis variant.
 */
function Icon({
  name,
  size = 20,
  fill = false,
  weight = 400,
  color = "currentColor",
  className = "",
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `material-symbols-outlined ${className}`,
    "aria-hidden": "true",
    style: {
      fontSize: size,
      color,
      fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${fill ? 500 : weight}, 'GRAD' 0, 'opsz' ${size}`,
      ...style
    }
  }, rest), name);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    padding: "10px 14px",
    fontSize: 13,
    radius: 10
  },
  md: {
    padding: "13px 20px",
    fontSize: 13,
    radius: 12
  },
  lg: {
    padding: "15px 26px",
    fontSize: 14,
    radius: 12
  }
};
function variantStyle(variant, disabled) {
  if (disabled) {
    return {
      background: "var(--al-surface-container-high)",
      color: "var(--al-outline)",
      boxShadow: "none",
      cursor: "not-allowed"
    };
  }
  switch (variant) {
    case "secondary":
      return {
        background: "var(--al-secondary-container)",
        color: "var(--al-on-secondary-container)",
        boxShadow: "none"
      };
    case "ghost":
      return {
        background: "#fff",
        color: "var(--al-on-surface-variant)",
        border: "1px solid var(--al-hairline-strong)",
        boxShadow: "none"
      };
    case "primary":
    default:
      return {
        background: "var(--al-gradient-cta)",
        color: "var(--al-on-primary)",
        boxShadow: "var(--al-shadow-cta)"
      };
  }
}

/**
 * Button — primary CTA (navy gradient), secondary (terracotta), or ghost.
 * Primary is the only sanctioned CTA treatment in Astro.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  disabled = false,
  className = "",
  style = {},
  ...rest
}) {
  const sz = SIZES[size] || SIZES.md;
  const v = variantStyle(variant, disabled);
  return /*#__PURE__*/React.createElement("button", _extends({
    className: className,
    disabled: disabled,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: sz.padding,
      border: v.border || 0,
      borderRadius: sz.radius,
      fontFamily: "var(--al-font)",
      fontSize: sz.fontSize,
      fontWeight: 700,
      letterSpacing: "0.02em",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "opacity var(--al-dur-fast) var(--al-ease)",
      ...v,
      ...style
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.opacity = "0.9";
    },
    onMouseLeave: e => {
      e.currentTarget.style.opacity = "1";
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: sz.fontSize + 5
  }) : null, children, iconRight ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: sz.fontSize + 5
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/data-display/SectionHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SectionHeader — the eyebrow + title + lede stack that opens every sheet
 * and page section. The eyebrow is the most repeated motif in the system.
 */
function SectionHeader({
  eyebrow,
  title,
  lede,
  as = "h3",
  className = "",
  style = {},
  ...rest
}) {
  const Title = as;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: style
  }, rest), eyebrow ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--al-font)",
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: 0.55,
      marginBottom: 8
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement(Title, {
    style: {
      margin: 0,
      fontFamily: "var(--al-font)",
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      color: "var(--al-primary)"
    }
  }, title), lede ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontFamily: "var(--al-font)",
      fontSize: 13,
      fontWeight: 500,
      color: "var(--al-on-surface-variant)",
      lineHeight: 1.5
    }
  }, lede) : null);
}
Object.assign(__ds_scope, { SectionHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/SectionHeader.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Sheet.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Sheet — the one elevation. A white card on the soft float shadow, radius 24.
 * Optional header (eyebrow + title + lede) and trailing action slot.
 */
function Sheet({
  children,
  eyebrow,
  title,
  lede,
  action,
  padded = true,
  className = "",
  style = {},
  ...rest
}) {
  const hasHeader = eyebrow || title || lede || action;
  return /*#__PURE__*/React.createElement("section", _extends({
    className: className,
    style: {
      background: "var(--al-surface-container-lowest)",
      borderRadius: 24,
      boxShadow: "var(--al-shadow-float)",
      overflow: "hidden",
      ...style
    }
  }, rest), hasHeader ? /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
      padding: "24px 28px 18px"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionHeader, {
    eyebrow: eyebrow,
    title: title,
    lede: lede
  }), action ? /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0
    }
  }, action) : null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: padded ? hasHeader ? "0 28px 28px" : "28px" : 0
    }
  }, children));
}
Object.assign(__ds_scope, { Sheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Sheet.jsx", error: String((e && e.message) || e) }); }

// components/data-display/StatusPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VARIANTS = {
  positive: {
    fg: "var(--al-status-positive)",
    bg: "var(--al-status-positive-bg)"
  },
  negative: {
    fg: "var(--al-status-negative)",
    bg: "var(--al-status-negative-bg)"
  },
  caution: {
    fg: "var(--al-status-caution)",
    bg: "var(--al-status-caution-bg)"
  },
  neutral: {
    fg: "var(--al-status-neutral)",
    bg: "var(--al-status-neutral-bg)"
  }
};

/**
 * StatusPill — the status vocabulary: a dot + uppercase label.
 * `tinted` (default) fills the pill bg; set `tinted={false}` for a bare
 * dot+label (the appointments "outcome" treatment).
 */
function StatusPill({
  children,
  variant = "neutral",
  tinted = true,
  className = "",
  style = {},
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: tinted ? 5 : 8,
      padding: tinted ? "3px 10px" : 0,
      borderRadius: 9999,
      fontFamily: "var(--al-font)",
      fontSize: tinted ? 10 : 12,
      fontWeight: tinted ? 800 : 700,
      letterSpacing: tinted ? "0.16em" : "normal",
      textTransform: tinted ? "uppercase" : "none",
      background: tinted ? v.bg : "transparent",
      color: v.fg,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: tinted ? 5 : 6,
      height: tinted ? 5 : 6,
      borderRadius: 9999,
      background: v.fg,
      flexShrink: 0
    }
  }), children);
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Field — label + bordered input wrap + optional help. Forgoes the four-sided
 * box feel with a soft white wrap and a hairline border that deepens on focus.
 */
function Field({
  label,
  required = false,
  help,
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  className = "",
  style = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    className: className,
    style: {
      display: "block",
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontFamily: "var(--al-font)",
      fontSize: 13,
      fontWeight: 800,
      color: "var(--al-primary)",
      marginBottom: 8
    }
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--al-status-negative)"
    }
  }, "\u2022") : null) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 14px",
      borderRadius: 12,
      background: focused ? "var(--al-surface-container-high)" : "#fff",
      border: `1px solid ${focused ? "rgba(0,30,64,.20)" : "var(--al-hairline-strong)"}`,
      transition: "background var(--al-dur-fast) var(--al-ease), border-color var(--al-dur-fast) var(--al-ease)"
    }
  }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    color: "var(--al-on-surface-variant)"
  }) : null, /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: "none",
      background: "transparent",
      fontFamily: "var(--al-font)",
      fontSize: 15,
      fontWeight: 700,
      color: "var(--al-primary)"
    }
  }, rest))), help ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      marginTop: 6,
      fontFamily: "var(--al-font)",
      fontSize: 12,
      color: "var(--al-on-surface-variant)",
      opacity: 0.75
    }
  }, help) : null);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/FilterPills.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * FilterPills — segmented filter row. Active pill fills navy; an optional
 * count appends as "Label · N". Rounded, borderless, transparent at rest.
 */
function FilterPills({
  options,
  value,
  onChange,
  counts,
  className = "",
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      display: "flex",
      gap: 4,
      flexWrap: "wrap",
      ...style
    }
  }, rest), options.map(opt => {
    const key = typeof opt === "string" ? opt : opt.key;
    const label = typeof opt === "string" ? opt : opt.label;
    const active = value === key;
    const count = counts && counts[key];
    return /*#__PURE__*/React.createElement("button", {
      key: key,
      type: "button",
      onClick: () => onChange && onChange(key),
      style: {
        padding: "8px 14px",
        borderRadius: 9999,
        border: 0,
        background: active ? "var(--al-primary)" : "transparent",
        fontFamily: "var(--al-font)",
        fontSize: 12,
        fontWeight: 700,
        color: active ? "#fff" : "var(--al-on-surface-variant)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        transition: "background var(--al-dur-fast) var(--al-ease), color var(--al-dur-fast) var(--al-ease)"
      }
    }, label, active && count != null ? /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 6,
        opacity: 0.6
      }
    }, "\u00B7", " ", count) : null);
  }));
}
Object.assign(__ds_scope, { FilterPills });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FilterPills.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Switch — the Atelier toggle. Track flips from hairline to navy when checked;
 * the white thumb slides 20px. Controlled via `checked` + `onChange`.
 */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  className = "",
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    className: className,
    style: {
      position: "relative",
      width: 44,
      height: 24,
      flexShrink: 0,
      borderRadius: 9999,
      border: 0,
      padding: 0,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      background: checked ? "var(--al-primary)" : "var(--al-outline-variant)",
      transition: "background var(--al-dur-fast) var(--al-ease)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 2,
      left: 2,
      width: 20,
      height: 20,
      borderRadius: 9999,
      background: "#fff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      transform: checked ? "translateX(20px)" : "translateX(0)",
      transition: "transform var(--al-dur-fast) var(--al-ease)"
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AppShell.jsx
try { (() => {
/* Astro App — sidebar + topbar shell. Composes Icon + Avatar from the bundle. */
const {
  Icon: ShellIcon,
  Avatar: ShellAvatar
} = window.AstroDesignSystem_424d7f;
const NAV_PRIMARY = [{
  key: "dashboard",
  label: "Dashboard",
  icon: "dashboard"
}, {
  key: "appointments",
  label: "Appointments",
  icon: "calendar_month"
}, {
  key: "customers",
  label: "Customers",
  icon: "group"
}, {
  key: "conflicts",
  label: "Conflicts",
  icon: "warning",
  badge: 1
}];
const NAV_SETTINGS = [{
  key: "availability",
  label: "Availability",
  icon: "schedule"
}, {
  key: "payment",
  label: "Payment Policy",
  icon: "receipt_long"
}, {
  key: "reminders",
  label: "Reminders",
  icon: "notifications"
}];
function NavItem({
  item,
  active,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      width: "100%",
      padding: "11px 14px",
      borderRadius: 10,
      border: 0,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "var(--al-font)",
      fontSize: 14,
      fontWeight: active ? 700 : 600,
      background: active ? "var(--al-primary)" : hover ? "var(--al-surface-container)" : "transparent",
      color: active ? "#fff" : "var(--al-on-surface-variant)",
      transition: "background var(--al-dur-fast) var(--al-ease)"
    }
  }, /*#__PURE__*/React.createElement(ShellIcon, {
    name: item.icon,
    size: 20,
    fill: active,
    color: active ? "#fff" : "var(--al-on-surface-variant)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), item.badge ? /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 20,
      height: 20,
      padding: "0 6px",
      borderRadius: 9999,
      display: "grid",
      placeItems: "center",
      fontSize: 11,
      fontWeight: 800,
      fontFamily: "var(--al-font-mono)",
      background: active ? "rgba(255,255,255,.16)" : "var(--al-secondary-container)",
      color: active ? "#fff" : "var(--al-on-secondary-container)"
    }
  }, item.badge) : null);
}
function AppShell({
  active,
  onNavigate,
  shopName = "Atelier No. 9",
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "264px 1fr",
      minHeight: "100%",
      background: "var(--al-surface-container-low)"
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      background: "var(--al-background)",
      borderRight: "1px solid var(--al-hairline)",
      padding: "32px 20px",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 42,
      height: 42,
      borderRadius: 12,
      background: "var(--al-gradient-cta)",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      boxShadow: "var(--al-shadow-mark)"
    }
  }, /*#__PURE__*/React.createElement(ShellIcon, {
    name: "dashboard_customize",
    size: 24,
    fill: true,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      letterSpacing: ".16em",
      textTransform: "uppercase",
      color: "var(--al-primary)"
    }
  }, "Astro")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .7,
      margin: "0 0 28px 54px"
    }
  }, shopName), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, NAV_PRIMARY.map(it => /*#__PURE__*/React.createElement(NavItem, {
    key: it.key,
    item: it,
    active: active === it.key,
    onClick: () => onNavigate(it.key)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .55,
      padding: "24px 14px 8px"
    }
  }, "Settings"), NAV_SETTINGS.map(it => /*#__PURE__*/React.createElement(NavItem, {
    key: it.key,
    item: it,
    active: active === it.key,
    onClick: () => onNavigate(it.key)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      paddingTop: 24,
      borderTop: "1px solid var(--al-hairline)",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(ShellAvatar, {
    initials: "JL",
    tier: "neutral",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--al-primary)"
    }
  }, "Jess Lindqvist"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)"
    }
  }, "Account & Profile")))), /*#__PURE__*/React.createElement("main", {
    style: {
      padding: "32px 48px 64px",
      display: "flex",
      flexDirection: "column",
      gap: 28,
      overflow: "auto"
    }
  }, children));
}
Object.assign(window, {
  AppShell
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Appointments.jsx
try { (() => {
/* Appointments screen — the canonical Atelier Light ledger: filter pills + table. */
const A = window.AstroDesignSystem_424d7f;
const ROWS = [{
  id: 1,
  i: "SM",
  n: "Sarah Mitchell",
  s: "Balayage refresh",
  time: "09:00",
  day: "Tue · Apr 28",
  amt: "£185",
  pay: "Paid",
  payV: "positive",
  out: "Settled",
  outV: "positive",
  tier: "top"
}, {
  id: 2,
  i: "JK",
  n: "Jordan Kerr",
  s: "Fade + beard sculpt",
  time: "10:30",
  day: "Tue · Apr 28",
  amt: "£42",
  pay: "Paid",
  payV: "positive",
  out: "Settled",
  outV: "positive",
  tier: "neutral"
}, {
  id: 3,
  i: "PN",
  n: "Priya Nair",
  s: "Gel infill + art",
  time: "12:15",
  day: "Tue · Apr 28",
  amt: "£64",
  pay: "Pending",
  payV: "caution",
  out: "Unresolved",
  outV: "caution",
  tier: "top"
}, {
  id: 4,
  i: "TR",
  n: "Taylor Reed",
  s: "Colour correction",
  time: "14:00",
  day: "Tue · Apr 28",
  amt: "£185",
  pay: "Failed",
  payV: "negative",
  out: "Voided",
  outV: "negative",
  tier: "risk"
}, {
  id: 5,
  i: "EL",
  n: "Emma Lund",
  s: "Blowout + toner",
  time: "15:30",
  day: "Tue · Apr 28",
  amt: "£58",
  pay: "Paid",
  payV: "positive",
  out: "Settled",
  outV: "positive",
  tier: "neutral"
}];
function SortMenu() {
  const [open, setOpen] = React.useState(false);
  const opts = ["Newest first", "Oldest first", "Amount: high to low"];
  const [sel, setSel] = React.useState(opts[0]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    style: {
      padding: "8px 12px",
      borderRadius: 10,
      background: "#fff",
      border: "1px solid var(--al-hairline-rest)",
      fontFamily: "var(--al-font)",
      fontSize: 12,
      fontWeight: 600,
      color: "var(--al-on-surface-variant)",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15
    }
  }, "\u2195"), /*#__PURE__*/React.createElement("span", null, sel), /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .6
    }
  }, "\u25BE")), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "calc(100% + 6px)",
      right: 0,
      background: "#fff",
      borderRadius: 12,
      padding: 6,
      minWidth: 210,
      boxShadow: "var(--al-shadow-menu)",
      border: "1px solid var(--al-hairline)",
      zIndex: 10
    }
  }, opts.map(o => /*#__PURE__*/React.createElement("div", {
    key: o,
    onClick: () => {
      setSel(o);
      setOpen(false);
    },
    style: {
      padding: "10px 12px",
      borderRadius: 8,
      fontSize: 13,
      cursor: "pointer",
      display: "flex",
      justifyContent: "space-between",
      color: o === sel ? "var(--al-primary)" : "var(--al-on-surface-variant)",
      fontWeight: o === sel ? 700 : 400,
      background: o === sel ? "var(--al-surface-container-low)" : "transparent"
    }
  }, o, o === sel && /*#__PURE__*/React.createElement("span", null, "\u2713")))));
}
function Appointments() {
  const [filter, setFilter] = React.useState("all");
  const [hover, setHover] = React.useState(null);
  const filtered = ROWS.filter(r => filter === "all" ? true : filter === "risk" ? r.tier === "risk" : r.out.toLowerCase() === filter);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--al-font)",
      fontSize: 40,
      fontWeight: 800,
      letterSpacing: "-.025em",
      color: "var(--al-primary)"
    }
  }, "Appointments"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "8px 0 0",
      fontSize: 14,
      fontWeight: 500,
      color: "var(--al-on-surface-variant)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums"
    }
  }, filtered.length), " shown \xB7 last 7 days")), /*#__PURE__*/React.createElement(A.Sheet, {
    padded: false
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 20px",
      borderBottom: "1px solid var(--al-hairline)",
      background: "var(--al-background)"
    }
  }, /*#__PURE__*/React.createElement(A.FilterPills, {
    value: filter,
    onChange: setFilter,
    options: [{
      key: "all",
      label: "All"
    }, {
      key: "settled",
      label: "Settled"
    }, {
      key: "voided",
      label: "Voided"
    }, {
      key: "unresolved",
      label: "Unresolved"
    }, {
      key: "risk",
      label: "Risk only"
    }],
    counts: {
      settled: ROWS.filter(r => r.out === "Settled").length,
      voided: 1,
      unresolved: 1,
      risk: 1
    }
  }), /*#__PURE__*/React.createElement(SortMenu, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      padding: "14px 24px",
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .6,
      background: "var(--al-surface-container-low)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 100px"
    }
  }, "Time"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 200px"
    }
  }, "Customer"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 170px"
    }
  }, "Service"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 110px"
    }
  }, "Payment"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 120px"
    }
  }, "Outcome"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 90px"
    }
  }, "Risk"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 36px"
    }
  })), filtered.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    onMouseEnter: () => setHover(r.id),
    onMouseLeave: () => setHover(null),
    style: {
      display: "flex",
      gap: 14,
      alignItems: "center",
      padding: "20px 24px",
      borderTop: i ? "1px solid var(--al-hairline)" : "none",
      background: hover === r.id ? "var(--al-background)" : "transparent",
      transition: "background var(--al-dur-instant) var(--al-ease)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 100px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 14,
      fontWeight: 700,
      color: "var(--al-primary)"
    }
  }, r.time), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--al-on-surface-variant)",
      opacity: .7,
      marginTop: 2,
      fontWeight: 600
    }
  }, r.day)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 200px",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(A.Avatar, {
    initials: r.i,
    tier: r.tier,
    size: 34
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "var(--al-on-surface)"
    }
  }, r.n)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 170px",
      fontSize: 14,
      fontWeight: 600,
      color: "var(--al-on-surface)"
    }
  }, r.s), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 110px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 14,
      fontWeight: 700,
      color: "var(--al-primary)"
    }
  }, r.amt), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: ".16em",
      textTransform: "uppercase",
      marginTop: 2,
      color: `var(--al-status-${r.payV})`
    }
  }, r.pay)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 120px"
    }
  }, /*#__PURE__*/React.createElement(A.StatusPill, {
    variant: r.outV,
    tinted: false
  }, r.out)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 90px"
    }
  }, /*#__PURE__*/React.createElement(A.StatusPill, {
    variant: r.tier === "top" ? "positive" : r.tier === "risk" ? "negative" : "neutral"
  }, r.tier === "top" ? "Top" : r.tier === "risk" ? "Risk" : "Neutral")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 36px",
      display: "flex",
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 9999,
      background: "var(--al-surface-container)",
      display: "grid",
      placeItems: "center",
      color: "var(--al-primary)",
      opacity: hover === r.id ? 1 : .45,
      transition: "opacity var(--al-dur-fast) var(--al-ease)"
    }
  }, "\u2192"))))));
}
Object.assign(window, {
  Appointments
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Appointments.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Customers.jsx
try { (() => {
/* Customers screen — reliability roster with tier scoring. */
const C = window.AstroDesignSystem_424d7f;
const CUSTOMERS = [{
  i: "SM",
  n: "Sarah Mitchell",
  visits: 24,
  score: 98,
  tier: "top",
  last: "2 days ago"
}, {
  i: "PN",
  n: "Priya Nair",
  visits: 18,
  score: 95,
  tier: "top",
  last: "5 days ago"
}, {
  i: "JK",
  n: "Jordan Kerr",
  visits: 11,
  score: 82,
  tier: "neutral",
  last: "1 week ago"
}, {
  i: "EL",
  n: "Emma Lund",
  visits: 9,
  score: 76,
  tier: "neutral",
  last: "2 weeks ago"
}, {
  i: "DK",
  n: "Dev Kapoor",
  visits: 6,
  score: 48,
  tier: "risk",
  last: "3 weeks ago"
}, {
  i: "TR",
  n: "Taylor Reed",
  visits: 4,
  score: 34,
  tier: "risk",
  last: "1 month ago"
}];
const TIER_LABEL = {
  top: "Top",
  neutral: "Neutral",
  risk: "Risk"
};
const TIER_VARIANT = {
  top: "positive",
  neutral: "neutral",
  risk: "negative"
};
function Customers() {
  const [tier, setTier] = React.useState("all");
  const [hover, setHover] = React.useState(null);
  const rows = CUSTOMERS.filter(c => tier === "all" || c.tier === tier);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--al-font)",
      fontSize: 40,
      fontWeight: 800,
      letterSpacing: "-.025em",
      color: "var(--al-primary)"
    }
  }, "Customers"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "8px 0 0",
      fontSize: 14,
      fontWeight: 500,
      color: "var(--al-on-surface-variant)"
    }
  }, "Reliability scoring across your client roster.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20
    }
  }, [["Top tier", CUSTOMERS.filter(c => c.tier === "top").length, "positive"], ["Neutral", CUSTOMERS.filter(c => c.tier === "neutral").length, "neutral"], ["At risk", CUSTOMERS.filter(c => c.tier === "risk").length, "negative"]].map(([lab, ct, v]) => /*#__PURE__*/React.createElement("article", {
    key: lab,
    style: {
      borderRadius: 24,
      background: "var(--al-surface-container-lowest)",
      boxShadow: "var(--al-shadow-float)",
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .6,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: `var(--al-status-${v})`
    }
  }), lab), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 36,
      fontWeight: 700,
      color: "var(--al-primary)"
    }
  }, ct)))), /*#__PURE__*/React.createElement(C.Sheet, {
    padded: false
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 20px",
      borderBottom: "1px solid var(--al-hairline)",
      background: "var(--al-background)"
    }
  }, /*#__PURE__*/React.createElement(C.FilterPills, {
    value: tier,
    onChange: setTier,
    options: [{
      key: "all",
      label: "All"
    }, {
      key: "top",
      label: "Top"
    }, {
      key: "neutral",
      label: "Neutral"
    }, {
      key: "risk",
      label: "Risk"
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      padding: "14px 24px",
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .6,
      background: "var(--al-surface-container-low)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 220px"
    }
  }, "Customer"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 110px"
    }
  }, "Visits"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 130px"
    }
  }, "Reliability"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 110px"
    }
  }, "Tier"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 120px",
      textAlign: "right"
    }
  }, "Last visit")), rows.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: c.n,
    onMouseEnter: () => setHover(c.n),
    onMouseLeave: () => setHover(null),
    style: {
      display: "flex",
      gap: 14,
      alignItems: "center",
      padding: "18px 24px",
      borderTop: i ? "1px solid var(--al-hairline)" : "none",
      background: hover === c.n ? "var(--al-background)" : "transparent",
      transition: "background var(--al-dur-instant) var(--al-ease)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 220px",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(C.Avatar, {
    initials: c.i,
    tier: c.tier,
    size: 38
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "var(--al-on-surface)"
    }
  }, c.n)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 110px",
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 14,
      fontWeight: 700,
      color: "var(--al-primary)"
    }
  }, c.visits), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 130px",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 6,
      borderRadius: 9999,
      background: "var(--al-surface-container)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${c.score}%`,
      height: "100%",
      borderRadius: 9999,
      background: `var(--al-status-${TIER_VARIANT[c.tier]})`
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 13,
      fontWeight: 700,
      color: "var(--al-primary)"
    }
  }, c.score)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 110px"
    }
  }, /*#__PURE__*/React.createElement(C.StatusPill, {
    variant: TIER_VARIANT[c.tier]
  }, TIER_LABEL[c.tier])), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 120px",
      textAlign: "right",
      fontSize: 13,
      color: "var(--al-on-surface-variant)"
    }
  }, c.last)))));
}
Object.assign(window, {
  Customers
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Customers.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Dashboard.jsx
try { (() => {
/* Dashboard screen — KPI summary cards + attention-required ledger. */
const D = window.AstroDesignSystem_424d7f;
function PageHeader({
  title,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--al-font)",
      fontSize: 40,
      fontWeight: 800,
      letterSpacing: "-.025em",
      color: "var(--al-primary)"
    }
  }, title), sub ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "8px 0 0",
      fontSize: 14,
      fontWeight: 500,
      color: "var(--al-on-surface-variant)"
    }
  }, sub) : null);
}
function Kpi({
  eyebrow,
  value,
  icon,
  foot
}) {
  return /*#__PURE__*/React.createElement("article", {
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: 24,
      background: "var(--al-surface-container-lowest)",
      boxShadow: "var(--al-shadow-float)",
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 12,
      right: 12,
      opacity: .08,
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement(D.Icon, {
    name: icon,
    size: 64,
    color: "var(--al-primary)",
    fill: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .55,
      marginBottom: 12
    }
  }, eyebrow), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 40,
      fontWeight: 700,
      color: "var(--al-primary)",
      letterSpacing: "-.02em"
    }
  }, value), foot ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 12,
      color: "var(--al-on-surface-variant)"
    }
  }, foot) : null);
}
const ATTENTION = [{
  i: "TR",
  n: "Taylor Reed",
  s: "Colour correction",
  t: "risk",
  time: "2:00 PM",
  day: "Tue · Apr 28",
  amt: "£185",
  pay: "Pending",
  payV: "caution"
}, {
  i: "DK",
  n: "Dev Kapoor",
  s: "Gel infill + art",
  t: "risk",
  time: "4:30 PM",
  day: "Tue · Apr 28",
  amt: "£64",
  pay: "Unpaid",
  payV: "neutral"
}, {
  i: "MO",
  n: "Mara Olsen",
  s: "Lash lift",
  t: "neutral",
  time: "11:15 AM",
  day: "Wed · Apr 29",
  amt: "£72",
  pay: "Paid",
  payV: "positive"
}];
function Dashboard() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Dashboard",
    sub: "Monitor high-risk appointments and reliability trends for Atelier No. 9."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Kpi, {
    eyebrow: "Upcoming (30d)",
    value: "48",
    icon: "event_upcoming"
  }), /*#__PURE__*/React.createElement(Kpi, {
    eyebrow: "High-risk clients",
    value: "3",
    icon: "warning",
    foot: "In selected window"
  }), /*#__PURE__*/React.createElement(Kpi, {
    eyebrow: "Deposits at risk",
    value: "\xA3312",
    icon: "account_balance_wallet"
  }), /*#__PURE__*/React.createElement(Kpi, {
    eyebrow: "Recovered (30d)",
    value: "\xA3540",
    icon: "loyalty",
    foot: "From 6 re-sold slots"
  })), /*#__PURE__*/React.createElement(D.Sheet, {
    eyebrow: "Needs attention",
    title: "High-risk appointments",
    lede: "Clients whose reliability score puts a deposit at risk this week.",
    padded: false
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      padding: "14px 28px",
      background: "var(--al-surface-container-low)",
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 110px"
    }
  }, "Time"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 220px"
    }
  }, "Customer"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 120px"
    }
  }, "Payment"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 90px"
    }
  }, "Tier")), ATTENTION.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 14,
      alignItems: "center",
      padding: "18px 28px",
      borderTop: i ? "1px solid var(--al-hairline)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 110px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 14,
      fontWeight: 700,
      color: "var(--al-primary)"
    }
  }, r.time), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--al-on-surface-variant)",
      opacity: .7,
      marginTop: 2,
      fontWeight: 600
    }
  }, r.day)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 220px",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(D.Avatar, {
    initials: r.i,
    tier: r.t,
    size: 34
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "var(--al-on-surface)"
    }
  }, r.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--al-on-surface-variant)"
    }
  }, r.s))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 120px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 14,
      fontWeight: 700,
      color: "var(--al-primary)"
    }
  }, r.amt), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: ".16em",
      textTransform: "uppercase",
      marginTop: 2,
      color: `var(--al-status-${r.payV})`
    }
  }, r.pay)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 90px"
    }
  }, /*#__PURE__*/React.createElement(D.StatusPill, {
    variant: r.t === "risk" ? "negative" : "neutral"
  }, r.t === "risk" ? "Risk" : "Neutral"))))));
}
Object.assign(window, {
  Dashboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Reminders.jsx
try { (() => {
/* Reminders settings screen — capacity dial + reminder timing toggles. */
const R = window.AstroDesignSystem_424d7f;
function CapacityDial({
  used,
  cap
}) {
  const atCap = used >= cap;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, Array.from({
    length: cap
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 10,
      height: 10,
      borderRadius: 9999,
      transition: "background var(--al-dur-normal) var(--al-ease)",
      background: i < used ? atCap ? "var(--al-status-caution)" : "var(--al-primary)" : "var(--al-surface-container-high)"
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 18,
      fontWeight: 800,
      color: atCap ? "var(--al-status-caution)" : "var(--al-primary)"
    }
  }, used, "/", cap));
}
function ReminderRow({
  icon,
  label,
  sub,
  defaultOn
}) {
  const [on, setOn] = React.useState(defaultOn);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "18px 28px",
      borderTop: "1px solid var(--al-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 12,
      background: "var(--al-surface-container)",
      display: "grid",
      placeItems: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(R.Icon, {
    name: icon,
    size: 20,
    color: "var(--al-primary)",
    fill: on
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "var(--al-on-surface)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--al-on-surface-variant)"
    }
  }, sub)), /*#__PURE__*/React.createElement(R.Switch, {
    checked: on,
    onChange: setOn
  }));
}
function Reminders() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--al-font)",
      fontSize: 40,
      fontWeight: 800,
      letterSpacing: "-.025em",
      color: "var(--al-primary)"
    }
  }, "Reminders"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "8px 0 0",
      fontSize: 14,
      fontWeight: 500,
      color: "var(--al-on-surface-variant)"
    }
  }, "Automated SMS that confirm, nudge, and re-sell cancelled slots.")), /*#__PURE__*/React.createElement(R.Sheet, {
    padded: false,
    eyebrow: "The cadence",
    title: "Reminder schedule",
    lede: "Each booking can trigger up to three messages. Toggle the ones your clients need."
  }, /*#__PURE__*/React.createElement(ReminderRow, {
    icon: "check_circle",
    label: "Booking confirmation",
    sub: "Sent immediately after a slot is booked",
    defaultOn: true
  }), /*#__PURE__*/React.createElement(ReminderRow, {
    icon: "schedule",
    label: "24-hour reminder",
    sub: "Day-before nudge with the deposit policy",
    defaultOn: true
  }), /*#__PURE__*/React.createElement(ReminderRow, {
    icon: "bolt",
    label: "Slot recovery offer",
    sub: "Re-sells a cancelled slot to the waitlist by SMS",
    defaultOn: true
  }), /*#__PURE__*/React.createElement(ReminderRow, {
    icon: "reviews",
    label: "Post-visit follow-up",
    sub: "Thank-you note + rebooking link"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(R.Sheet, {
    eyebrow: "Per-slot cap",
    title: "Recovery throttle"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 18px",
      fontSize: 13,
      color: "var(--al-on-surface-variant)",
      lineHeight: 1.5
    }
  }, "Limit how many recovery offers go out for a single opening before it closes automatically."), /*#__PURE__*/React.createElement(CapacityDial, {
    used: 3,
    cap: 3
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(R.StatusPill, {
    variant: "caution",
    tinted: false
  }, "At capacity \u2014 offers paused"))), /*#__PURE__*/React.createElement(R.Sheet, {
    eyebrow: "Preview",
    title: "SMS template"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 16,
      background: "var(--al-surface-container-low)",
      padding: 18,
      fontSize: 14,
      lineHeight: 1.55,
      color: "var(--al-on-surface)"
    }
  }, "Hi Sarah \u2014 a ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--al-primary)"
    }
  }, "2:00 PM colour slot"), " just opened at Atelier No. 9 this Tuesday. Reply ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--al-primary)"
    }
  }, "YES"), " in the next 30 min to claim it."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(R.Button, {
    size: "sm"
  }, "Save template"), /*#__PURE__*/React.createElement(R.Button, {
    size: "sm",
    variant: "ghost"
  }, "Send test")))));
}
Object.assign(window, {
  Reminders
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Reminders.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Booking.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Client-facing booking page — redesigned in Atelier Light. */
const BK = window.AstroDesignSystem_424d7f;
const SLOTS = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
function CheckBox({
  checked,
  onChange
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "checkbox",
    "aria-checked": checked,
    onClick: () => onChange(!checked),
    style: {
      width: 20,
      height: 20,
      flexShrink: 0,
      marginTop: 1,
      borderRadius: 6,
      cursor: "pointer",
      padding: 0,
      display: "grid",
      placeItems: "center",
      background: checked ? "var(--al-primary)" : "#fff",
      border: `1px solid ${checked ? "var(--al-primary)" : "var(--al-hairline-strong)"}`,
      transition: "background var(--al-dur-fast) var(--al-ease), border-color var(--al-dur-fast) var(--al-ease)"
    }
  }, checked ? /*#__PURE__*/React.createElement(BK.Icon, {
    name: "check",
    size: 14,
    color: "#fff",
    weight: 700
  }) : null);
}
function FieldLabel({
  children,
  required
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 13,
      fontWeight: 800,
      color: "var(--al-primary)",
      marginBottom: 8
    }
  }, children, required ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--al-status-negative)"
    }
  }, "\u2022") : null);
}
function PlainInput(props) {
  return /*#__PURE__*/React.createElement("input", _extends({}, props, {
    style: {
      width: "100%",
      boxSizing: "border-box",
      padding: "12px 14px",
      borderRadius: 12,
      background: "#fff",
      border: "1px solid var(--al-hairline-strong)",
      outline: "none",
      fontFamily: "var(--al-font)",
      fontSize: 15,
      fontWeight: 700,
      color: "var(--al-primary)"
    }
  }));
}
function Booking() {
  const [date, setDate] = React.useState("2026-06-23");
  const [slot, setSlot] = React.useState("11:00 AM");
  const [sms, setSms] = React.useState(false);
  const [emailRem, setEmailRem] = React.useState(true);
  const [done, setDone] = React.useState(false);
  return /*#__PURE__*/React.createElement("section", {
    className: "m-section m-pad-x",
    style: {
      background: "var(--al-surface-container-low)",
      padding: "56px 32px 88px",
      minHeight: "70vh"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 720,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .55
    }
  }, "Book an appointment"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "10px 0 0",
      fontSize: "clamp(32px, 6cqi, 44px)",
      fontWeight: 800,
      letterSpacing: "-.03em",
      color: "var(--al-primary)"
    }
  }, "Book with kicksnare"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "8px 0 0",
      fontSize: 15,
      fontWeight: 500,
      color: "var(--al-on-surface-variant)"
    }
  }, "Free Audit \xB7 60 minutes")), done ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--al-surface-container-lowest)",
      borderRadius: 24,
      boxShadow: "var(--al-shadow-float)",
      padding: 40,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-grid",
      placeItems: "center",
      width: 56,
      height: 56,
      borderRadius: 9999,
      background: "var(--al-status-positive-bg)",
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(BK.Icon, {
    name: "check_circle",
    size: 30,
    fill: true,
    color: "var(--al-status-positive)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-status-positive)",
      marginBottom: 8
    }
  }, "Booking confirmed"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 26,
      fontWeight: 800,
      letterSpacing: "-.02em",
      color: "var(--al-primary)"
    }
  }, "You\u2019re booked with kicksnare"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "12px 0 0",
      fontSize: 15,
      color: "var(--al-on-surface-variant)"
    }
  }, "Free Audit \xB7 ", slot, " \xB7 60 minutes. We\u2019ve sent the details to your email."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      display: "flex",
      gap: 12,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(BK.Button, null, "Manage booking"), /*#__PURE__*/React.createElement(BK.Button, {
    variant: "ghost",
    onClick: () => setDone(false)
  }, "Book again"))) : /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--al-surface-container-lowest)",
      borderRadius: 24,
      boxShadow: "var(--al-shadow-float)",
      padding: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 16,
      background: "var(--al-surface-container-low)",
      padding: "18px 20px",
      marginBottom: 28,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .55
    }
  }, "Selected service"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 800,
      color: "var(--al-primary)",
      marginTop: 6
    }
  }, "Free Audit"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--al-on-surface-variant)",
      marginTop: 2
    }
  }, "60 minutes \xB7 UTC")), /*#__PURE__*/React.createElement(BK.StatusPill, {
    variant: "positive"
  }, "Selected")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(FieldLabel, {
    required: true
  }, "Date"), /*#__PURE__*/React.createElement(PlainInput, {
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement(FieldLabel, {
    required: true
  }, "Available slots"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--al-on-surface-variant)",
      opacity: .75,
      margin: "-2px 0 12px"
    }
  }, "60 minutes \xB7 UTC"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))",
      gap: 10
    }
  }, SLOTS.map(s => {
    const active = slot === s;
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      type: "button",
      onClick: () => setSlot(s),
      "aria-pressed": active,
      style: {
        height: 46,
        borderRadius: 12,
        cursor: "pointer",
        fontFamily: "var(--al-font-mono)",
        fontVariantNumeric: "tabular-nums",
        fontSize: 13,
        fontWeight: 700,
        border: active ? "0" : "1px solid var(--al-hairline-strong)",
        background: active ? "var(--al-primary)" : "#fff",
        color: active ? "#fff" : "var(--al-on-surface-variant)",
        boxShadow: active ? "var(--al-shadow-ring)" : "none",
        transition: "background var(--al-dur-fast) var(--al-ease), color var(--al-dur-fast) var(--al-ease)"
      }
    }, s);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FieldLabel, {
    required: true
  }, "Full name"), /*#__PURE__*/React.createElement(PlainInput, {
    placeholder: "Jordan Carter",
    autoComplete: "name"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FieldLabel, {
    required: true
  }, "Phone"), /*#__PURE__*/React.createElement(PlainInput, {
    type: "tel",
    placeholder: "+44 7700 900123",
    autoComplete: "tel"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FieldLabel, {
    required: true
  }, "Email"), /*#__PURE__*/React.createElement(PlainInput, {
    type: "email",
    placeholder: "you@email.com",
    autoComplete: "email"
  })))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 16,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(CheckBox, {
    checked: sms,
    onChange: setSms
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--al-on-surface)",
      lineHeight: 1.4
    }
  }, "Send me SMS updates about this booking.")), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: 18,
      borderRadius: 16,
      background: "var(--al-surface-container)",
      marginBottom: 28,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(CheckBox, {
    checked: emailRem,
    onChange: setEmailRem
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: 14,
      fontWeight: 700,
      color: "var(--al-on-surface)"
    }
  }, "Send me email reminders."), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      marginTop: 5,
      fontSize: 13,
      lineHeight: 1.5,
      color: "var(--al-on-surface-variant)"
    }
  }, "Get an email reminder about 24 hours before your appointment. You can opt out later."))), /*#__PURE__*/React.createElement(BK.Button, {
    size: "lg",
    style: {
      width: "100%"
    },
    onClick: () => setDone(true)
  }, "Confirm booking"))));
}
Object.assign(window, {
  Booking
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Booking.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/FeatureRows.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Marketing — 3 alternating feature rows with editorial product vignettes + stat floats. */
const FR = window.AstroDesignSystem_424d7f;
function FloatCard({
  value,
  label,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "m-float",
    style: {
      position: "absolute",
      background: "var(--al-surface-container-lowest)",
      borderRadius: 16,
      boxShadow: "var(--al-shadow-menu)",
      padding: "14px 16px",
      maxWidth: 180,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 26,
      fontWeight: 800,
      letterSpacing: "-.02em",
      color: "var(--al-primary)"
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--al-on-surface-variant)",
      marginTop: 2,
      lineHeight: 1.35
    }
  }, label));
}

/* ── Vignette 1: client scoring card ─────────────────────────── */
function ScoringVignette() {
  const rows = [["SM", "Sarah Mitchell", 98, "top", "positive", "Top"], ["JK", "Jordan Kerr", 82, "neutral", "neutral", "Neutral"], ["TR", "Taylor Reed", 34, "risk", "negative", "Risk"]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--al-surface-container-lowest)",
      borderRadius: 24,
      boxShadow: "var(--al-shadow-float)",
      padding: "22px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .55,
      marginBottom: 16
    }
  }, "Client reliability"), rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "13px 0",
      borderTop: i ? "1px solid var(--al-hairline)" : "none"
    }
  }, /*#__PURE__*/React.createElement(FR.Avatar, {
    initials: r[0],
    tier: r[3],
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "var(--al-on-surface)"
    }
  }, r[1]), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90,
      height: 6,
      borderRadius: 9999,
      background: "var(--al-surface-container)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: r[2] + "%",
      height: "100%",
      background: `var(--al-status-${r[4]})`
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 12,
      fontWeight: 700,
      color: "var(--al-primary)"
    }
  }, r[2]))), /*#__PURE__*/React.createElement(FR.StatusPill, {
    variant: r[4]
  }, r[5]))));
}

/* ── Vignette 2: slot recovery SMS ───────────────────────────── */
function RecoveryVignette() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--al-surface-container-lowest)",
      borderRadius: 24,
      boxShadow: "var(--al-shadow-float)",
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "var(--al-surface-container)",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement(FR.Icon, {
    name: "bolt",
    size: 20,
    fill: true,
    color: "var(--al-primary)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: "var(--al-primary)"
    }
  }, "Slot recovery"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(FR.StatusPill, {
    variant: "caution",
    tinted: false
  }, "Offer sent"))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 16,
      background: "var(--al-surface-container-low)",
      padding: 16,
      fontSize: 14,
      lineHeight: 1.5,
      color: "var(--al-on-surface)"
    }
  }, "Hi Priya \u2014 a ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--al-primary)"
    }
  }, "2:00 PM colour slot"), " just opened this Tuesday. Reply ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--al-primary)"
    }
  }, "YES"), " in the next 30 min to claim it."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifycontent: "flex-end",
      gap: 8,
      marginTop: 14,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "var(--al-status-positive-bg)",
      color: "var(--al-status-positive)",
      borderRadius: 12,
      padding: "8px 12px",
      fontSize: 13,
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement(FR.Icon, {
    name: "check_circle",
    size: 16,
    fill: true
  }), " Priya replied YES \xB7 slot filled")));
}

/* ── Vignette 3: deposit receipt ─────────────────────────────── */
function DepositVignette() {
  const lines = [["Service", "Colour correction"], ["Deposit collected", "£40.00"], ["Method", "Visa ·· 4242"], ["Status", "Paid at booking"]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--al-surface-container-lowest)",
      borderRadius: 24,
      boxShadow: "var(--al-shadow-float)",
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .55
    }
  }, "Deposit receipt"), /*#__PURE__*/React.createElement(FR.StatusPill, {
    variant: "positive"
  }, "Paid")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 40,
      fontWeight: 800,
      letterSpacing: "-.02em",
      color: "var(--al-primary)"
    }
  }, "\xA340.00"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "11px 0",
      borderTop: "1px solid var(--al-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--al-on-surface-variant)"
    }
  }, l[0]), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--al-on-surface)",
      fontVariantNumeric: "tabular-nums"
    }
  }, l[1])))));
}
const FEATURES = [{
  eyebrow: "Client scoring",
  title: "Know your clients before they walk in",
  body: "Astro scores every client on show-up history, cancellation patterns, and deposit behaviour. Risk clients are flagged before they cost you money.",
  Vignette: ScoringVignette,
  floats: [{
    value: "94%",
    label: "client show-up rate",
    style: {
      top: -18,
      right: -14
    }
  }, {
    value: "3×",
    label: "fewer no-shows with risk flagging",
    style: {
      bottom: -20,
      left: -16
    }
  }],
  flip: false
}, {
  eyebrow: "Slot recovery",
  title: "Never lose revenue when someone cancels",
  body: "When a booking is cancelled, Astro automatically offers the slot to your best available clients in priority order. Your calendar fills itself.",
  Vignette: RecoveryVignette,
  floats: [{
    value: "8 min",
    label: "average time to fill a cancelled slot",
    style: {
      top: -18,
      left: -16
    }
  }, {
    value: "£240",
    label: "avg. weekly recovery",
    style: {
      bottom: -20,
      right: -14
    }
  }],
  flip: true
}, {
  eyebrow: "Deposits",
  title: "Get paid before they even show up",
  body: "Deposits are collected at booking time via Stripe. No-shows can’t cost you — you’ve already been paid. Refunds for eligible cancellations are automatic.",
  Vignette: DepositVignette,
  floats: [{
    value: "£0",
    label: "owed after a no-show",
    style: {
      top: -18,
      right: -14
    }
  }, {
    value: "100%",
    label: "deposit collection at booking",
    style: {
      bottom: -20,
      left: -16
    }
  }],
  flip: false
}];
function FeatureRows() {
  return /*#__PURE__*/React.createElement("section", {
    className: "m-section m-pad-x",
    style: {
      background: "var(--al-background)",
      padding: "100px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: 110
    }
  }, FEATURES.map((f, i) => {
    const text = /*#__PURE__*/React.createElement("div", {
      key: "t",
      className: "m-feat-text"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: ".2em",
        textTransform: "uppercase",
        color: "var(--al-on-surface-variant)",
        opacity: .55
      }
    }, f.eyebrow), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: "12px 0 0",
        fontSize: "clamp(26px, 4.4cqi, 34px)",
        fontWeight: 800,
        letterSpacing: "-.025em",
        color: "var(--al-primary)",
        lineHeight: 1.1
      }
    }, f.title), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: "16px 0 0",
        fontSize: 17,
        lineHeight: 1.6,
        color: "var(--al-on-surface-variant)",
        maxWidth: 440
      }
    }, f.body));
    const art = /*#__PURE__*/React.createElement("div", {
      key: "a",
      className: "m-feat-art",
      style: {
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement(f.Vignette, null), f.floats.map((fl, j) => /*#__PURE__*/React.createElement(FloatCard, _extends({
      key: j
    }, fl))));
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "m-feat-grid",
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 72,
        alignItems: "center"
      }
    }, f.flip ? [art, text] : [text, art]);
  })));
}
Object.assign(window, {
  FeatureRows
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/FeatureRows.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/HowItWorks.jsx
try { (() => {
/* Marketing — "How Astro works" 3-step band on a subtle sunken surface. */
const HIW = window.AstroDesignSystem_424d7f;
const STEPS = [{
  n: "01",
  icon: "menu_book",
  title: "Clients book and pay a deposit",
  body: "Share your booking link. Clients pick a time, pay a deposit upfront, and get an instant SMS confirmation."
}, {
  n: "02",
  icon: "verified_user",
  title: "Astro protects your schedule",
  body: "Risk clients are flagged automatically. Late cancellations keep your deposit — your time is never wasted."
}, {
  n: "03",
  icon: "autorenew",
  title: "Cancelled slots fill themselves",
  body: "When someone cancels, Astro offers the slot to your best clients. Your calendar stays full without you lifting a finger."
}];
function SectionKicker({
  eyebrow,
  title,
  sub,
  align = "center"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: align,
      maxWidth: 640,
      margin: align === "center" ? "0 auto" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .55
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "12px 0 0",
      fontSize: "clamp(30px, 5cqi, 40px)",
      fontWeight: 800,
      letterSpacing: "-.025em",
      color: "var(--al-primary)"
    }
  }, title), sub ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "12px 0 0",
      fontSize: 17,
      fontWeight: 500,
      color: "var(--al-on-surface-variant)"
    }
  }, sub) : null);
}
function HowItWorks() {
  return /*#__PURE__*/React.createElement("section", {
    className: "m-section m-pad-x",
    style: {
      background: "var(--al-surface-container-low)",
      padding: "96px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(SectionKicker, {
    eyebrow: "How it works",
    title: "How Astro works",
    sub: "From booking to protected revenue \u2014 completely automated."
  }), /*#__PURE__*/React.createElement("div", {
    className: "m-3col",
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 24,
      marginTop: 56
    }
  }, STEPS.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.n,
    style: {
      background: "var(--al-surface-container-lowest)",
      borderRadius: 24,
      boxShadow: "var(--al-shadow-float)",
      padding: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontSize: 64,
      lineHeight: 1,
      fontWeight: 800,
      color: "var(--al-primary)",
      opacity: .12
    }
  }, s.n), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "grid",
      placeItems: "center",
      width: 48,
      height: 48,
      borderRadius: 12,
      background: "var(--al-surface-container)",
      margin: "18px 0 18px"
    }
  }, /*#__PURE__*/React.createElement(HIW.Icon, {
    name: s.icon,
    size: 24,
    fill: true,
    color: "var(--al-primary)"
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 19,
      fontWeight: 800,
      letterSpacing: "-.01em",
      color: "var(--al-primary)"
    }
  }, s.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "10px 0 0",
      fontSize: 15,
      lineHeight: 1.55,
      color: "var(--al-on-surface-variant)"
    }
  }, s.body))))));
}
Object.assign(window, {
  HowItWorks,
  SectionKicker
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/HowItWorks.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/MarketingClose.jsx
try { (() => {
/* Marketing — FAQ accordion + closing navy CTA band + footer. */
const FC = window.AstroDesignSystem_424d7f;
const FAQ = [{
  q: "What happens if a client no-shows?",
  a: "Astro retains the deposit automatically and updates the client’s reliability score. Two or more no-shows within 90 days flags them as a risk client, so you can decide whether to accept future bookings from them."
}, {
  q: "Can clients cancel and get a refund?",
  a: "Cancelling before your cutoff window triggers a full automatic refund — no awkward conversations. After the cutoff, you keep the deposit. You set the cutoff (e.g. 24 hours) when you configure your policy."
}, {
  q: "How long does it take to get started?",
  a: "Most beauty professionals are live and taking bookings within 20 minutes. Set your availability, cancellation policy, and deposit amount, then share your booking link."
}, {
  q: "Is there a free trial?",
  a: "Yes — a 14-day free trial, no credit card required. Every feature is available during the trial, including smart client scoring, slot recovery, and Stripe deposits."
}, {
  q: "Can I cancel anytime?",
  a: "Astro is month-to-month, no contracts. Cancel from your account settings at any time. Your data is exported on request."
}, {
  q: "Which calendar and payment apps does Astro work with?",
  a: "Astro integrates with Google Calendar and processes payments via Stripe. SMS confirmations go out through Twilio. Additional integrations are on the roadmap."
}];
function Faq() {
  const [open, setOpen] = React.useState(0);
  return /*#__PURE__*/React.createElement("section", {
    className: "m-section m-pad-x",
    style: {
      background: "var(--al-background)",
      padding: "96px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 760,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .55
    }
  }, "FAQ"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "12px 0 0",
      fontSize: "clamp(30px, 5cqi, 40px)",
      fontWeight: 800,
      letterSpacing: "-.025em",
      color: "var(--al-primary)"
    }
  }, "Common questions"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "12px 0 0",
      fontSize: 17,
      color: "var(--al-on-surface-variant)"
    }
  }, "Everything you need to know about Astro.")), /*#__PURE__*/React.createElement("div", null, FAQ.map((item, i) => {
    const isOpen = open === i;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        borderTop: i ? "1px solid var(--al-hairline)" : "none"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpen(isOpen ? -1 : i),
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "22px 0",
        border: 0,
        background: "transparent",
        cursor: "pointer",
        textAlign: "left"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18,
        fontWeight: 700,
        color: isOpen ? "var(--al-primary)" : "var(--al-on-surface)"
      }
    }, item.q), /*#__PURE__*/React.createElement(FC.Icon, {
      name: "expand_more",
      size: 22,
      color: "var(--al-on-surface-variant)",
      style: {
        transform: isOpen ? "rotate(180deg)" : "none",
        transition: "transform var(--al-dur-normal) var(--al-ease)"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateRows: isOpen ? "1fr" : "0fr",
        transition: "grid-template-rows var(--al-dur-normal) var(--al-ease)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        paddingBottom: 22,
        fontSize: 15,
        lineHeight: 1.6,
        color: "var(--al-on-surface-variant)"
      }
    }, item.a))));
  }))));
}
function MarketingClose() {
  const links = ["How it works", "Features", "Pricing", "FAQ", "Privacy Policy", "Terms of Service", "Contact"];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    className: "m-pad-x",
    style: {
      background: "var(--al-background)",
      padding: "0 32px 96px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: "0 auto",
      background: "var(--al-gradient-cta)",
      borderRadius: 32,
      padding: "72px 48px",
      textAlign: "center",
      boxShadow: "var(--al-shadow-cta)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "clamp(32px, 5.4cqi, 46px)",
      fontWeight: 800,
      letterSpacing: "-.03em",
      color: "#fff",
      lineHeight: 1.05
    }
  }, "Your time is worth protecting"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "18px auto 0",
      maxWidth: 480,
      fontSize: 18,
      lineHeight: 1.55,
      color: "rgba(255,255,255,.7)"
    }
  }, "Start your 14-day free trial. Be taking protected bookings in 20 minutes."), /*#__PURE__*/React.createElement("div", {
    className: "m-cta-actions",
    style: {
      display: "flex",
      justifyContent: "center",
      gap: 14,
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      padding: "15px 28px",
      borderRadius: 12,
      border: 0,
      cursor: "pointer",
      fontFamily: "var(--al-font)",
      fontSize: 14,
      fontWeight: 800,
      background: "var(--al-secondary-container)",
      color: "var(--al-on-secondary-container)"
    }
  }, "Start free trial"), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: "15px 28px",
      borderRadius: 12,
      cursor: "pointer",
      fontFamily: "var(--al-font)",
      fontSize: 14,
      fontWeight: 700,
      background: "transparent",
      color: "#fff",
      border: "1px solid rgba(255,255,255,.3)"
    }
  }, "Book a demo")))), /*#__PURE__*/React.createElement("footer", {
    className: "m-pad-x",
    style: {
      background: "var(--al-background)",
      borderTop: "1px solid var(--al-hairline)",
      padding: "48px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 9,
      background: "var(--al-gradient-cta)",
      color: "#fff",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement(FC.Icon, {
    name: "dashboard_customize",
    size: 19,
    fill: true,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 800,
      letterSpacing: ".16em",
      textTransform: "uppercase",
      color: "var(--al-primary)"
    }
  }, "Astro")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "10px 28px"
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontSize: 14,
      color: "var(--al-on-surface-variant)",
      textDecoration: "none"
    }
  }, l))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      color: "var(--al-on-surface-variant)",
      opacity: .7
    }
  }, "\xA9 2026 Astro. All rights reserved."))));
}
Object.assign(window, {
  Faq,
  MarketingClose
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/MarketingClose.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/MarketingHero.jsx
try { (() => {
/* Marketing — hero with editorial schedule preview (no stock photography). */
const MH = window.AstroDesignSystem_424d7f;
const HERO_DAYS = [["M", 17], ["T", 18], ["W", 19], ["T", 20], ["F", 21], ["S", 22], ["S", 23]];
const HERO_ROWS = [{
  t: "09:00",
  i: "SM",
  n: "Sarah M.",
  s: "Balayage refresh",
  tier: "top",
  v: "positive",
  lab: "Top"
}, {
  t: "10:30",
  i: "JK",
  n: "Jordan K.",
  s: "Fade + beard sculpt",
  tier: "neutral",
  v: "neutral",
  lab: "Neutral"
}, {
  t: "14:00",
  i: "TR",
  n: "Taylor R.",
  s: "Colour correction",
  tier: "risk",
  v: "negative",
  lab: "Risk"
}];
function MetricChip({
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: "var(--al-surface-container-low)",
      borderRadius: 12,
      padding: "10px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .6
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 18,
      fontWeight: 700,
      color: "var(--al-primary)",
      marginTop: 2
    }
  }, value));
}
function MarketingHero() {
  return /*#__PURE__*/React.createElement("section", {
    className: "m-section m-pad-x",
    style: {
      background: "var(--al-background)",
      padding: "84px 32px 96px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-hero-grid",
    style: {
      maxWidth: 1200,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1.05fr 0.95fr",
      gap: 64,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(MH.Badge, {
    variant: "curator",
    style: {
      letterSpacing: ".06em"
    }
  }, "For salons, stylists & barbers"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "22px 0 0",
      fontSize: "clamp(40px, 7cqi, 64px)",
      lineHeight: 1.02,
      fontWeight: 800,
      letterSpacing: "-.03em",
      color: "var(--al-primary)"
    }
  }, "Stop losing money to no-shows"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "22px 0 0",
      maxWidth: 460,
      fontSize: 18,
      lineHeight: 1.55,
      fontWeight: 500,
      color: "var(--al-on-surface-variant)"
    }
  }, "Astro protects your income with smart client scoring, automated deposits, and instant slot recovery."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      marginTop: 30
    }
  }, /*#__PURE__*/React.createElement(MH.Button, {
    size: "lg",
    iconRight: "arrow_forward"
  }, "Start free trial"), /*#__PURE__*/React.createElement(MH.Button, {
    size: "lg",
    variant: "ghost"
  }, "See how it works")), /*#__PURE__*/React.createElement("div", {
    className: "m-hero-pills",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 26
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex"
    }
  }, ["SM", "PN", "JK", "EL"].map((x, i) => /*#__PURE__*/React.createElement("span", {
    key: x,
    style: {
      marginLeft: i ? -10 : 0,
      border: "2px solid var(--al-background)",
      borderRadius: 9999
    }
  }, /*#__PURE__*/React.createElement(MH.Avatar, {
    initials: x,
    tier: i === 0 ? "top" : "neutral",
    size: 30
  })))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--al-on-surface-variant)"
    }
  }, "Trusted by 500+ beauty professionals"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--al-surface-container-lowest)",
      borderRadius: 24,
      boxShadow: "var(--al-shadow-float)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "18px 22px",
      borderBottom: "1px solid var(--al-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .6
    }
  }, "Today \xB7 Apr 19"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: "var(--al-primary)",
      marginTop: 3
    }
  }, "Your day at a glance")), /*#__PURE__*/React.createElement(MH.StatusPill, {
    variant: "positive"
  }, "Synced")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7,1fr)",
      gap: 6,
      padding: "14px 18px",
      borderBottom: "1px solid var(--al-hairline)"
    }
  }, HERO_DAYS.map(([d, n], i) => {
    const active = i === 2;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        borderRadius: 10,
        padding: "7px 0",
        textAlign: "center",
        background: active ? "var(--al-primary)" : "var(--al-surface-container-low)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: active ? "rgba(255,255,255,.7)" : "var(--al-on-surface-variant)"
      }
    }, d), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--al-font-mono)",
        fontSize: 12,
        fontWeight: 700,
        color: active ? "#fff" : "var(--al-primary)",
        marginTop: 2
      }
    }, n));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 18px"
    }
  }, HERO_ROWS.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 6px",
      borderTop: i ? "1px solid var(--al-hairline)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 52px",
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 13,
      fontWeight: 700,
      color: "var(--al-primary)"
    }
  }, r.t), /*#__PURE__*/React.createElement(MH.Avatar, {
    initials: r.i,
    tier: r.tier,
    size: 32
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--al-on-surface)"
    }
  }, r.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--al-on-surface-variant)"
    }
  }, r.s)), /*#__PURE__*/React.createElement(MH.StatusPill, {
    variant: r.v
  }, r.lab)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      padding: "12px 18px 18px",
      borderTop: "1px solid var(--al-hairline)"
    }
  }, /*#__PURE__*/React.createElement(MetricChip, {
    label: "Booked",
    value: "6/8"
  }), /*#__PURE__*/React.createElement(MetricChip, {
    label: "Revenue",
    value: "\xA3462"
  }), /*#__PURE__*/React.createElement(MetricChip, {
    label: "At risk",
    value: "1"
  }))))));
}
Object.assign(window, {
  MarketingHero
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/MarketingHero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/MarketingNav.jsx
try { (() => {
/* Marketing — sticky top nav (Atelier Light). */
const MN = window.AstroDesignSystem_424d7f;
function MarketingNav() {
  const links = ["How it works", "Features", "Pricing", "FAQ"];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "rgba(249,249,247,0.82)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--al-hairline)"
    }
  }, /*#__PURE__*/React.createElement("nav", {
    className: "m-pad-x",
    style: {
      maxWidth: 1200,
      margin: "0 auto",
      height: 72,
      padding: "0 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 9,
      background: "var(--al-gradient-cta)",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      boxShadow: "var(--al-shadow-mark)"
    }
  }, /*#__PURE__*/React.createElement(MN.Icon, {
    name: "dashboard_customize",
    size: 20,
    fill: true,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 19,
      fontWeight: 800,
      letterSpacing: ".16em",
      textTransform: "uppercase",
      color: "var(--al-primary)"
    }
  }, "Astro")), /*#__PURE__*/React.createElement("div", {
    className: "m-nav-links",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 34
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--al-on-surface-variant)",
      textDecoration: "none"
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("a", {
    className: "m-nav-signin",
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--al-on-surface-variant)",
      textDecoration: "none"
    }
  }, "Sign in"), /*#__PURE__*/React.createElement(MN.Button, {
    size: "sm"
  }, "Start free trial"))));
}
Object.assign(window, {
  MarketingNav
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/MarketingNav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Pricing.jsx
try { (() => {
/* Marketing — pricing (one plan, monthly/annual toggle). */
const PR = window.AstroDesignSystem_424d7f;
const PLAN_FEATURES = ["Unlimited bookings", "Smart client scoring", "Slot recovery automation", "Stripe deposit collection", "SMS confirmations", "Cancellation policy enforcement", "Business dashboard", "Email support"];
function Pricing() {
  const [period, setPeriod] = React.useState("monthly");
  const price = period === "annual" ? Math.round(49 * 0.8) : 49;
  return /*#__PURE__*/React.createElement("section", {
    className: "m-section m-pad-x",
    style: {
      background: "var(--al-surface-container-low)",
      padding: "96px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 480,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .55
    }
  }, "Simple pricing"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "12px 0 0",
      fontSize: "clamp(30px, 5cqi, 40px)",
      fontWeight: 800,
      letterSpacing: "-.025em",
      color: "var(--al-primary)"
    }
  }, "One plan. Full protection.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      gap: 4,
      padding: 4,
      borderRadius: 9999,
      background: "var(--al-surface-container)"
    }
  }, ["monthly", "annual"].map(v => {
    const active = period === v;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      onClick: () => setPeriod(v),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 9999,
        border: 0,
        cursor: "pointer",
        fontFamily: "var(--al-font)",
        fontSize: 13,
        fontWeight: 700,
        textTransform: "capitalize",
        background: active ? "var(--al-primary)" : "transparent",
        color: active ? "#fff" : "var(--al-on-surface-variant)",
        transition: "background var(--al-dur-fast) var(--al-ease)"
      }
    }, v, v === "annual" ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 800,
        padding: "2px 8px",
        borderRadius: 9999,
        background: active ? "rgba(255,255,255,.16)" : "var(--al-secondary-container)",
        color: active ? "#fff" : "var(--al-on-secondary-container)"
      }
    }, "Save 20%") : null);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 32,
      background: "var(--al-surface-container-lowest)",
      borderRadius: 24,
      boxShadow: "var(--al-shadow-float)",
      padding: 36
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--al-on-surface-variant)",
      opacity: .6
    }
  }, "Astro Pro"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 6,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--al-font-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 60,
      lineHeight: 1,
      fontWeight: 800,
      letterSpacing: "-.03em",
      color: "var(--al-primary)"
    }
  }, "$", price), /*#__PURE__*/React.createElement("span", {
    style: {
      marginBottom: 8,
      fontSize: 18,
      color: "var(--al-on-surface-variant)"
    }
  }, "/mo")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 18,
      marginTop: 6,
      fontSize: 13,
      color: "var(--al-on-surface-variant)",
      opacity: .8
    }
  }, period === "annual" ? "billed annually" : ""), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: "20px 0 28px",
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, PLAN_FEATURES.map(f => /*#__PURE__*/React.createElement("li", {
    key: f,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(PR.Icon, {
    name: "check",
    size: 18,
    color: "var(--al-status-positive)",
    weight: 600
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: "var(--al-on-surface)"
    }
  }, f)))), /*#__PURE__*/React.createElement(PR.Button, {
    size: "lg",
    style: {
      width: "100%"
    }
  }, "Start free trial"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "14px 0 0",
      textAlign: "center",
      fontSize: 13,
      color: "var(--al-on-surface-variant)",
      opacity: .8
    }
  }, "No credit card required"))));
}
Object.assign(window, {
  Pricing
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Pricing.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.SectionHeader = __ds_scope.SectionHeader;

__ds_ns.Sheet = __ds_scope.Sheet;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.FilterPills = __ds_scope.FilterPills;

__ds_ns.Switch = __ds_scope.Switch;

})();
