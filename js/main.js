/* Albums: put WebP files in images/<album>-1.webp, -2.webp ... (about 600px wide, 60-90 KB each). Each grid in index.html lists the width x height of its photos in data-dims.
   Only the open tab loads, and only as it scrolls into view. Missing files simply stay as blank tiles. */
var io=("IntersectionObserver"in window)?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var i=e.target;i.src=i.dataset.src;io.unobserve(i)}})},{rootMargin:"200px"}):null;
document.querySelectorAll(".panel").forEach(function(p){
 var g=p.querySelector(".grid"),ds=g.dataset.dims?g.dataset.dims.split(","):[],n=ds.length||+g.dataset.n;
 for(var k=1;k<=n;k++){var f=document.createElement("figure"),im=new Image();
  im.alt=p.id+" piece "+k;var d=(ds[k-1]||"600x800").split("x");f.setAttribute("role","button");f.style.aspectRatio=d[0]+"/"+d[1];im.width=+d[0];im.height=+d[1];im.decoding="async";im.dataset.src="images/"+p.id+"-"+k+".webp";
  im.onerror=function(){this.remove()};f.appendChild(im);g.appendChild(f);p._imgs=(p._imgs||[]).concat(im)}
});
function load(p){(p._imgs||[]).forEach(function(i){if(!i.src){io?io.observe(i):(i.src=i.dataset.src)}})}
load(document.querySelector(".panel.on"));
document.querySelectorAll(".tabs button").forEach(function(b){b.addEventListener("click",function(){
 document.querySelectorAll(".tabs button").forEach(function(x){x.setAttribute("aria-selected",x===b)});
 document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id===b.dataset.t)});
 load(document.getElementById(b.dataset.t))})});
/* Photos: tap any album photo to view it large. Arrows, swipe and Esc work. */
var dlg=document.createElement("dialog");dlg.className="lb";
dlg.innerHTML='<button class="x" aria-label="Close">\u00d7</button><button class="pv" aria-label="Previous">\u2039</button><img alt=""><button class="nx" aria-label="Next">\u203a</button>';
document.body.appendChild(dlg);
var lbi=dlg.querySelector("img"),cur=[],ci=0,tx=0;
function show(){var m=cur[ci];lbi.src=m.dataset.src;lbi.alt=m.alt}
function step(d){ci=(ci+d+cur.length)%cur.length;show()}
document.addEventListener("click",function(e){var m=e.target.closest(".grid img");if(!m||!m.src)return;
 cur=[].slice.call(m.closest(".panel").querySelectorAll("img")).filter(function(x){return x.src});ci=cur.indexOf(m);show();dlg.showModal()});
dlg.addEventListener("click",function(e){var c=e.target.className;if(e.target===dlg||c==="x")dlg.close();else if(c==="pv")step(-1);else if(c==="nx")step(1)});
dlg.addEventListener("keydown",function(e){if(e.key==="ArrowLeft")step(-1);if(e.key==="ArrowRight")step(1)});
dlg.addEventListener("touchstart",function(e){tx=e.changedTouches[0].clientX},{passive:true});
dlg.addEventListener("touchend",function(e){var d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>50)step(d<0?1:-1)});
/* Instagram reels: nothing loads until a visitor taps play, then Instagram's own player opens in place. */
document.addEventListener("click",function(e){var r=e.target.closest(".reel");if(!r||r.querySelector("iframe"))return;
 var u=r.dataset.url.split("?")[0].replace(/\/?$/,"/")+"embed/",f=document.createElement("iframe");
 f.src=u;f.allow="autoplay; encrypted-media; fullscreen";f.setAttribute("allowfullscreen","");f.title="Instagram reel";r.textContent="";r.appendChild(f)});
/* Gentle reveal: each block fades up once as it scrolls into view. */
document.documentElement.classList.add("js");
var rvo=("IntersectionObserver"in window)?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");rvo.unobserve(e.target)}})},{threshold:.15}):null;
document.querySelectorAll("h2,.intro p,.steps li,.tabs,.reel,.maker blockquote,.book p,.book .btn,.grid figure").forEach(function(el,i){
 el.classList.add("rv");if(el.matches(".steps li")){el.style.setProperty("--d",(Array.prototype.indexOf.call(el.parentNode.children,el)*.09)+"s")}
 rvo?rvo.observe(el):el.classList.add("in")});
/* Fabric: stripes drift on their own and shift with scroll, like cloth being pulled. */
(function(){var h=document.querySelector(".hero");if(!h||matchMedia("(prefers-reduced-motion:reduce)").matches)return;
 var on=true,run=false,t0=performance.now();
 function tick(t){if(!on){run=false;return}var y=window.scrollY;
  h.style.setProperty("--x",(((t-t0)/1000)*8-y*.35).toFixed(1));h.style.setProperty("--y",(-y*.3).toFixed(1));requestAnimationFrame(tick)}
 function go(){if(!run){run=true;requestAnimationFrame(tick)}}
 if("IntersectionObserver"in window){new IntersectionObserver(function(es){on=es[0].isIntersecting;if(on)go()}).observe(h)}
 go()})();
