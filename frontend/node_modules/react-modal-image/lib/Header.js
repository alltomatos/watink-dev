"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _react = _interopRequireDefault(require("react"));

var _icons = require("./icons");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function isSameOrigin(href) {
  // @ts-ignore
  return document.location.hostname !== new URL(href, document.location).hostname;
}
/**
 * Triggers image download from cross origin URLs
 * 
 * `<a href="..." download>foo</a> works only for same-origin URLs.
 * Further info: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-download
 */


var crossOriginDownload = function crossOriginDownload(href) {
  return function (event) {
    if (!isSameOrigin(href)) {
      // native download will be triggered by `download` attribute
      return;
    } // else proceed to use `fetch` for cross origin image download


    event.preventDefault();
    fetch(href).then(function (res) {
      if (!res.ok) {
        console.error("Failed to download image, HTTP status " + res.status + " from " + href);
      }

      return res.blob().then(function (blob) {
        var tmpAnchor = document.createElement("a");
        tmpAnchor.setAttribute("download", href.split("/").pop());
        tmpAnchor.href = URL.createObjectURL(blob);
        tmpAnchor.click();
      });
    })["catch"](function (err) {
      console.error(err);
      console.error("Failed to download image from " + href);
    });
  };
};

var Header = function Header(_ref) {
  var image = _ref.image,
      alt = _ref.alt,
      zoomed = _ref.zoomed,
      toggleZoom = _ref.toggleZoom,
      toggleRotate = _ref.toggleRotate,
      onClose = _ref.onClose,
      enableDownload = _ref.enableDownload,
      enableZoom = _ref.enableZoom,
      enableRotate = _ref.enableRotate;
  return /*#__PURE__*/_react["default"].createElement("div", {
    className: "__react_modal_image__header"
  }, /*#__PURE__*/_react["default"].createElement("span", {
    className: "__react_modal_image__icon_menu"
  }, enableDownload && /*#__PURE__*/_react["default"].createElement("a", {
    href: image,
    download: true,
    onClick: crossOriginDownload(image)
  }, /*#__PURE__*/_react["default"].createElement(_icons.DownloadIcon, null)), enableZoom && /*#__PURE__*/_react["default"].createElement("a", {
    onClick: toggleZoom
  }, zoomed ? /*#__PURE__*/_react["default"].createElement(_icons.ZoomOutIcon, null) : /*#__PURE__*/_react["default"].createElement(_icons.ZoomInIcon, null)), enableRotate && /*#__PURE__*/_react["default"].createElement("a", {
    onClick: toggleRotate
  }, /*#__PURE__*/_react["default"].createElement(_icons.RotateIcon, null)), /*#__PURE__*/_react["default"].createElement("a", {
    onClick: onClose
  }, /*#__PURE__*/_react["default"].createElement(_icons.CloseIcon, null))), alt && /*#__PURE__*/_react["default"].createElement("span", {
    className: "__react_modal_image__caption"
  }, alt));
};

var _default = Header;
exports["default"] = _default;