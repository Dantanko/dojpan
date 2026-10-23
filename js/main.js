/* Albums: put WebP files in images/<album>-<outfit>.webp (about 600px wide, 60-90 KB each).
   Extra views of the same outfit: images/<album>-<outfit>-2.webp, -3.webp ... and set data-views in index.html.
   Each grid lists data-dims (width x height of each main photo). Only the open tab loads, as it scrolls into view. */
function U(p){return p}
var io=("IntersectionObserver"in window)?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var i=e.target;i.src=i.dataset.src;io.unobserve(i)}})},{rootMargin:"200px"}):null;
document.querySelectorAll(".panel").forEach(function(p){
 var g=p.querySelector(".grid"),ds=g.dataset.dims?g.dataset.dims.split(","):[],vs=g.dataset.views?g.dataset.views.split(","):[],n=ds.length||+g.dataset.n;p._v=[];
 for(var k=1;k<=n;k++){var f=document.createElement("figure"),im=new Image(),d=(ds[k-1]||"600x800").split("x");
  f.setAttribute("role","button");f.tabIndex=0;f.dataset.k=k;f.style.aspectRatio=d[0]+"/"+d[1];
  im.alt=p.id+" outfit "+k;im.width=+d[0];im.height=+d[1];im.decoding="async";im.dataset.src=U("images/"+p.id+"-"+k+".webp");
  im.onerror=function(){this.parentNode.remove();if(!g.querySelector("figure"))g.innerHTML="<p>New pieces coming soon.</p>"};
  f.appendChild(im);g.appendChild(f);p._v[k]=+(vs[k-1]||1)}
});
/* Hero arches: show the newest outfits on the site (highest numbers), rotating through albums that have photos. */
(function(){var ar=document.querySelector(".latest");if(!ar)return;
 var ps=[].filter.call(document.querySelectorAll(".panel"),function(p){return p.querySelector(".grid").dataset.dims}),pk=[];
 for(var r=0;pk.length<5&&r<60;r++){ps.forEach(function(p){var k=p._v.length-1-r;if(k>=1&&pk.length<5)pk.push([p.id,k])})}
 if(!pk.length)return;ar.innerHTML="";
 pk.forEach(function(x){var g=document.getElementById(x[0]).querySelector(".grid"),d=g.dataset.dims.split(",")[x[1]-1].split("x"),m=new Image();
  m.src=U("images/"+x[0]+"-"+x[1]+".webp");m.alt=x[0]+" outfit "+x[1];m.width=+d[0];m.height=+d[1];m.dataset.a=x[0];m.dataset.k=x[1];m.onerror=function(){this.remove()};ar.appendChild(m)})})();
function load(p){[].forEach.call(p.querySelectorAll("img"),function(i){if(!i.src&&i.dataset.src){io?io.observe(i):(i.src=i.dataset.src)}})}
load(document.querySelector(".panel.on"));
document.querySelectorAll(".tabs button").forEach(function(b){b.addEventListener("click",function(){
 document.querySelectorAll(".tabs button").forEach(function(x){x.setAttribute("aria-selected",x===b)});
 document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id===b.dataset.t)});
 load(document.getElementById(b.dataset.t))})});

/* Quick view: tap an outfit to see it large, flip through its views, and ask about it on WhatsApp. */
var qv=document.createElement("dialog");qv.className="qv";
qv.innerHTML='<button class="x" aria-label="Close">\u00d7</button><div class="qv-i"><button class="pv" aria-label="Previous">\u2039</button><img alt=""><button class="nx" aria-label="Next">\u203a</button></div><div class="qv-t"><h3></h3><small></small><div class="th-row"></div><a class="btn" target="_blank" rel="noopener">Ask about this outfit</a></div>';
document.body.appendChild(qv);
var qi=qv.querySelector(".qv-i img"),qh=qv.querySelector("h3"),qs=qv.querySelector("small"),qt=qv.querySelector(".th-row"),qa=qv.querySelector(".qv-t .btn"),seq=[],ix=0,dir=1,tx=0,guard=0,alb="";
function pathOf(a,k,j){return U("images/"+a+"-"+k+(j>1?"-"+j:"")+".webp")}
function build(p){seq=[];[].forEach.call(p.querySelectorAll("figure"),function(f){var k=+f.dataset.k,v=p._v[k];for(var j=1;j<=v;j++)seq.push({k:k,j:j,v:v})})}
function show(){var s=seq[ix];qi.src=pathOf(alb,s.k,s.j);qh.textContent=alb.charAt(0).toUpperCase()+alb.slice(1)+" outfit "+s.k;qs.textContent=s.v>1?"View "+s.j+" of "+s.v:"";
 qt.innerHTML="";if(s.v>1)for(var j=1;j<=s.v;j++){var b=document.createElement("button"),t=new Image();b.dataset.j=j;b.setAttribute("aria-label","View "+j);if(j===s.j)b.setAttribute("aria-current","true");t.src=pathOf(alb,s.k,j);t.alt="";b.appendChild(t);qt.appendChild(b)}
 qa.href="https://wa.me/2348133464931?text="+encodeURIComponent("Hello DOJ Panache, I'd like to ask about "+alb+" outfit "+s.k+" on your website.")}
function step(d){dir=d;ix=(ix+d+seq.length)%seq.length;show()}
qi.onload=function(){guard=0};qi.onerror=function(){if(++guard<seq.length&&seq.length>1)step(dir)};
function openQ(f){var p=f.closest(".panel"),k=+f.dataset.k;alb=p.id;build(p);for(var i=0;i<seq.length;i++){if(seq[i].k===k&&seq[i].j===1){ix=i;break}}show();qv.showModal()}
document.addEventListener("click",function(e){var f=e.target.closest(".grid figure");if(f)openQ(f)});
document.addEventListener("click",function(e){var a=e.target.closest(".latest img");if(!a)return;var f=document.querySelector("#"+a.dataset.a+' figure[data-k="'+a.dataset.k+'"]');if(f)openQ(f)});
document.addEventListener("keydown",function(e){var f=e.target.closest&&e.target.closest(".grid figure");if(f&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openQ(f)}});
qv.addEventListener("click",function(e){var t=e.target,c=t.className;
 if(t===qv||c==="x")qv.close();else if(c==="pv")step(-1);else if(c==="nx")step(1);
 else{var b=t.closest(".th-row button");if(b){var s=seq[ix];for(var i=0;i<seq.length;i++){if(seq[i].k===s.k&&seq[i].j===+b.dataset.j){ix=i;break}}show()}}});
qv.addEventListener("keydown",function(e){if(e.key==="ArrowLeft")step(-1);if(e.key==="ArrowRight")step(1)});
qv.addEventListener("touchstart",function(e){tx=e.changedTouches[0].clientX},{passive:true});
qv.addEventListener("touchend",function(e){var d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>50)step(d<0?1:-1)});

/* Instagram reels: nothing loads until a visitor taps play, then Instagram's own player opens in place. */
document.addEventListener("click",function(e){var r=e.target.closest(".reel");if(!r||r.querySelector("iframe"))return;
 var f=document.createElement("iframe");f.src=r.dataset.url.split("?")[0].replace(/\/?$/,"/")+"embed/";
 f.allow="autoplay; encrypted-media; fullscreen";f.setAttribute("allowfullscreen","");f.title="Instagram reel";r.textContent="";r.appendChild(f)});

/* Gentle reveal: each block fades in as it enters view, from either direction, so scrolling back up fades too. */
document.documentElement.classList.add("js");
var rvo=("IntersectionObserver"in window)?new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle("in",e.isIntersecting)})},{threshold:.12}):null;
document.querySelectorAll("h2,.tabs,.steps li,.about>*,.reel,.grid figure,.latest img").forEach(function(el){
 el.classList.add("rv");if(el.matches(".steps li,.latest img")){el.style.setProperty("--d",([].indexOf.call(el.parentNode.children,el)*.08)+"s")}
 rvo?rvo.observe(el):el.classList.add("in")});

/* Fabric: hero stripes drift on their own and shift with scroll, like cloth being pulled. */
(function(){var h=document.querySelector(".hero");if(!h||matchMedia("(prefers-reduced-motion:reduce)").matches)return;
 var on=true,run=false,t0=performance.now();
 function tick(t){if(!on){run=false;return}var y=window.scrollY;h.style.setProperty("--x",(((t-t0)/1000)*8-y*.35).toFixed(1));h.style.setProperty("--y",(-y*.3).toFixed(1));requestAnimationFrame(tick)}
 function go(){if(!run){run=true;requestAnimationFrame(tick)}}
 if("IntersectionObserver"in window){new IntersectionObserver(function(es){on=es[0].isIntersecting;if(on)go()}).observe(h)}
 go()})();

/* Menu: mobile toggle, and Albums menu links open the matching album. */
var bg=document.querySelector(".burger"),mn=document.getElementById("menu");
bg.addEventListener("click",function(){var o=mn.classList.toggle("open");bg.setAttribute("aria-expanded",o)});
mn.addEventListener("click",function(e){var a=e.target.closest("a");if(!a)return;if(a.dataset.go){var t=document.querySelector('.tabs [data-t="'+a.dataset.go+'"]');if(t)t.click()}mn.classList.remove("open");bg.setAttribute("aria-expanded","false")});

/* Header: transparent over the hero with a light logo, solid with a dark logo once you scroll. */
var hd=document.querySelector("header");function hs(){hd.classList.toggle("solid",window.scrollY>30)}hs();window.addEventListener("scroll",hs,{passive:true});
