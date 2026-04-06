// CS Quill Sidebar Webview Script
(function(){
  if(navigator.serviceWorker){
    navigator.serviceWorker.register=function(){return Promise.resolve()};
    navigator.serviceWorker.getRegistration=function(){return Promise.resolve(void 0)};
    navigator.serviceWorker.getRegistrations=function(){return Promise.resolve([])};
  }

  var v = acquireVsCodeApi();
  function send(type){ v.postMessage({type:type}); }

  document.getElementById('a').onclick = function(){ send('analyze-current'); };
  document.getElementById('f').onclick = function(){ send('fix-all'); };
  document.getElementById('r').onclick = function(){ send('reconnect'); };

  window.addEventListener('message', function(e){
    var m = e.data;
    if(m.type === 'health-update'){
      var pl = m.payload;
      document.getElementById('s').textContent = pl.score != null ? pl.score : '--';
      document.getElementById('e').textContent = pl.errorCount > 0 ? pl.errorCount + '건 에러' : '';
      var d = document.getElementById('d');
      var t = document.getElementById('t');
      d.className = pl.connected ? 'dot on' : 'dot';
      t.textContent = pl.connected ? '데몬 연결됨' : '데몬 미연결';
    }
  });

  send('request-status');
})();
