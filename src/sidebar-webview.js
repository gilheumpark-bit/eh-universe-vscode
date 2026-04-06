// CS Quill Sidebar Webview Script
(function(){
  var vscode = acquireVsCodeApi();

  document.getElementById('btn-analyze').addEventListener('click', function(){
    vscode.postMessage({ type: 'analyze-current' });
  });
  document.getElementById('btn-fix-all').addEventListener('click', function(){
    vscode.postMessage({ type: 'fix-all' });
  });
  document.getElementById('btn-reconnect').addEventListener('click', function(){
    vscode.postMessage({ type: 'reconnect' });
  });

  window.addEventListener('message', function(event){
    var data = event.data;
    if(data.type === 'health-update'){
      var p = data.payload;
      document.getElementById('score').textContent = p.score != null ? p.score : '--';
      document.getElementById('error-count').textContent = p.errorCount > 0 ? p.errorCount + '건 에러' : '';
      var dot = document.getElementById('status-dot');
      var text = document.getElementById('status-text');
      if(p.connected){
        dot.className = 'status-dot connected';
        text.textContent = '데몬 연결됨';
      } else {
        dot.className = 'status-dot disconnected';
        text.textContent = '데몬 미연결';
      }
    }
  });

  vscode.postMessage({ type: 'request-status' });
})();
