import React from "react";
import { ZoomInIcon, ZoomOutIcon, DownloadIcon, CloseIcon, RotateIcon } from "./icons";

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
  return /*#__PURE__*/React.createElement("div", {
    className: "__react_modal_image__header"
  }, /*#__PURE__*/React.createElement("span", {
    className: "__react_modal_image__icon_menu"
  }, enableDownload && /*#__PURE__*/React.createElement("a", {
    href: image,
    download: true,
    onClick: crossOriginDownload(image)
  }, /*#__PURE__*/React.createElement(DownloadIcon, null)), enableZoom && /*#__PURE__*/React.createElement("a", {
    onClick: toggleZoom
  }, zoomed ? /*#__PURE__*/React.createElement(ZoomOutIcon, null) : /*#__PURE__*/React.createElement(ZoomInIcon, null)), enableRotate && /*#__PURE__*/React.createElement("a", {
    onClick: toggleRotate
  }, /*#__PURE__*/React.createElement(RotateIcon, null)), /*#__PURE__*/React.createElement("a", {
    onClick: onClose
  }, /*#__PURE__*/React.createElement(CloseIcon, null))), alt && /*#__PURE__*/React.createElement("span", {
    className: "__react_modal_image__caption"
  }, alt));
};

export default Header;