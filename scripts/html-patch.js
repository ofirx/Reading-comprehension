/**
 * Patch services.html so listening text and audio paths are stored in the HTML file.
 */
(function (global) {
  var SERVICES_FILE = "services.html";
  var DEFAULT_TEXT_START = "No text file loaded";

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function patchServicesHtml(html, patch) {
    var out = html;
    if (patch.audioSrc) {
      var src = patch.audioSrc.replace(/"/g, "");
      out = out.replace(/<audio([^>]*id=["']listeningPageAudio["'][^>]*)>/i, function (match, attrs) {
        var cleaned = attrs.replace(/\s+src=["'][^"']*["']/gi, "");
        return '<audio' + cleaned + ' src="' + src + '">';
      });
    }
    if (patch.text !== undefined && patch.text !== null) {
      var body = escapeHtml(patch.text);
      out = out.replace(
        /(<pre[^>]*id=["']listeningTextPreview["'][^>]*>)([\s\S]*?)(<\/pre>)/i,
        "$1" + body + "$3"
      );
    }
    return out;
  }

  function readAudioSrcFromHtml(html) {
    var m = html.match(/<audio[^>]*id=["']listeningPageAudio["'][^>]*\ssrc=["']([^"']+)["']/i);
    return m ? m[1] : "";
  }

  function readTextFromHtml(html) {
    var m = html.match(/<pre[^>]*id=["']listeningTextPreview["'][^>]*>([\s\S]*?)<\/pre>/i);
    if (!m) return "";
    var el = document.createElement("pre");
    el.innerHTML = m[1];
    var text = el.textContent || "";
    if (!text.trim() || text.indexOf(DEFAULT_TEXT_START) === 0) return "";
    return text;
  }

  function downloadServicesHtml(html) {
    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = SERVICES_FILE;
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 500);
  }

  global.ReadingHtmlPatch = {
    SERVICES_FILE: SERVICES_FILE,
    DEFAULT_TEXT_START: DEFAULT_TEXT_START,
    patchServicesHtml: patchServicesHtml,
    readAudioSrcFromHtml: readAudioSrcFromHtml,
    readTextFromHtml: readTextFromHtml,
    downloadServicesHtml: downloadServicesHtml,
  };
})(typeof window !== "undefined" ? window : globalThis);
