// Native fullscreen for the drawing workspace (toolbar button + F11-style toggle).
const fullscreenButton=document.createElement('button');
fullscreenButton.id='fullscreen';
fullscreenButton.type='button';
fullscreenButton.title='全屏显示图纸';
fullscreenButton.textContent='全屏';
$('#fit')?.after(fullscreenButton);

function fullscreenElement(){
  return document.fullscreenElement||document.webkitFullscreenElement||null;
}
function requestAppFullscreen(target){
  const fn=target.requestFullscreen||target.webkitRequestFullscreen;
  return fn?fn.call(target):Promise.reject(Error('unsupported'));
}
function exitAppFullscreen(){
  const fn=document.exitFullscreen||document.webkitExitFullscreen;
  return fn?fn.call(document):Promise.resolve();
}
function refreshFullscreenLabel(){
  fullscreenButton.textContent=fullscreenElement()?'退出全屏':'全屏';
  fullscreenButton.title=fullscreenElement()?'退出全屏':'全屏显示图纸';
}
fullscreenButton.onclick=async()=>{
  try{
    if(fullscreenElement())await exitAppFullscreen();
    else{
      const target=$('#editor-root')||$('.editor')||document.documentElement;
      await requestAppFullscreen(target);
    }
  }catch{toast('当前浏览器无法进入全屏')}
  refreshFullscreenLabel();
};
document.addEventListener('fullscreenchange',refreshFullscreenLabel);
document.addEventListener('webkitfullscreenchange',refreshFullscreenLabel);
refreshFullscreenLabel();
