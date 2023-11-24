var _global = typeof window === 'object' && window.window === window
  ? window : typeof self === 'object' && self.self === self
  ? self : typeof global === 'object' && global.global === global
  ? global
  : this

function bom(blob, opts) {
  if (typeof opts === 'undefined') opts = { autoBom: false }
  else if (typeof opts !== 'object') {
    console.warn('Desativado: Esperava-se que o terceiro argumento fosse um objeto')
    opts = { autoBom: !opts }
  }

  // Adiciona BOM para tipos UTF-8 XML e text/* (incluindo HTML)
  // Observação: seu navegador converterá automaticamente UTF-16 U+FEFF para EF BB BF
  if (opts.autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
    return new Blob([String.fromCharCode(0xFEFF), blob], { type: blob.type })
  }
  return blob
}

function download(url, nome, opts) {
  var xhr = new XMLHttpRequest()
  xhr.open('GET', url)
  xhr.responseType = 'blob'
  xhr.onload = function () {
    salvarComo(xhr.response, nome, opts)
  }
  xhr.onerror = function () {
    console.error('não foi possível baixar o arquivo')
  }
  xhr.send()
}

function corsHabilitado(url) {
  var xhr = new XMLHttpRequest()
  // Use síncrono para evitar o bloqueio de pop-ups
  xhr.open('HEAD', url, false)
  try {
    xhr.send()
  } catch (e) {}
  return xhr.status >= 200 && xhr.status <= 299
}

function clicar(no) {
  try {
    no.dispatchEvent(new MouseEvent('click'))
  } catch (e) {
    var evt = document.createEvent('MouseEvents')
    evt.initMouseEvent('click', true, true, window, 0, 0, 0, 80,
                          20, false, false, false, false, 0, null)
    no.dispatchEvent(evt)
  }
}

var isMacOSWebView = _global.navigator && /Macintosh/.test(navigator.userAgent) && /AppleWebKit/.test(navigator.userAgent) && !/Safari/.test(navigator.userAgent)

var salvarComo = _global.salvarComo || (
  (typeof window !== 'object' || window !== _global)
    ? function salvarComo() { /* noop */ }

  : ('download' in HTMLAnchorElement.prototype && !isMacOSWebView)
  ? function salvarComo(blob, nome, opts) {
    var URL = _global.URL || _global.webkitURL
    var a = document.createElementNS('http://www.w3.org/1999/xhtml', 'a')
    nome = nome || blob.name || 'download'

    a.download = nome
    a.rel = 'noopener' // tabnabbing

    if (typeof blob === 'string') {
      a.href = blob
      if (a.origin !== location.origin) {
        corsHabilitado(a.href)
          ? download(blob, nome, opts)
          : clicar(a, a.target = '_blank')
      } else {
        clicar(a)
      }
    } else {
      a.href = URL.createObjectURL(blob)
      setTimeout(function () { URL.revokeObjectURL(a.href) }, 4E4) // 40s
      setTimeout(function () { clicar(a) }, 0)
    }
  }

  : 'msSalvarOuAbrirBlob' in navigator
  ? function salvarComo(blob, nome, opts) {
    nome = nome || blob.name || 'download'

    if (typeof blob === 'string') {
      if (corsHabilitado(blob)) {
        download(blob, nome, opts)
      } else {
        var a = document.createElement('a')
        a.href = blob
        a.target = '_blank'
        setTimeout(function () { clicar(a) })
      }
    } else {
      navigator.msSalvarOuAbrirBlob(bom(blob, opts), nome)
    }
  }

  : function salvarComo(blob, nome, opts, popup) {
    popup = popup || open('', '_blank')
    if (popup) {
      popup.document.title =
      popup.document.body.innerText = 'baixando...'
    }

    if (typeof blob === 'string') return download(blob, nome, opts)

    var force = blob.type === 'application/octet-stream'
    var isSafari = /constructor/i.test(_global.HTMLElement) || _global.safari
    var isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent)

    if ((isChromeIOS || (force && isSafari) || isMacOSWebView) && typeof FileReader !== 'undefined') {
      var reader = new FileReader()
      reader.onloadend = function () {
        var url = reader.result
        url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, 'data:attachment/file;')
        if (popup) popup.location.href = url
        else location = url
        popup = null // reverse-tabnabbing #460
      }
      reader.readAsDataURL(blob)
    } else {
      var URL = _global.URL || _global.webkitURL
      var url = URL.createObjectURL(blob)
      if (popup) popup.location = url
      else location.href = url
      popup = null // reverse-tabnabbing #460
      setTimeout(function () { URL.revokeObjectURL(url) }, 4E4) // 40s
    }
  }
)

_global.salvarComo = salvarComo.salvarComo = salvarComo

if (typeof module !== 'undefined') {
  module.exports = salvarComo;
}
s