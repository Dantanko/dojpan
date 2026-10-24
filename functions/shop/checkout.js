import { html, layout } from '../_lib/page.js';

const body = `<main class="pg"><div class="w">
<nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/shop/">Ready-to-wear</a> / Bag</nav>
<h1>Your bag</h1>
<div id="empty" hidden><p class="lead">Your bag is empty.</p><p class="more"><a class="btn" href="/shop/">See ready-to-wear</a></p></div>
<div id="full" hidden>
<div class="bag" id="bag"></div>
<form class="frm" id="f" novalidate>
<label>Full name<input name="name" autocomplete="name" required></label>
<label>Phone (WhatsApp if possible)<input name="phone" type="tel" autocomplete="tel" required></label>
<label>Email<input name="email" type="email" autocomplete="email" required></label>
<label>How would you like to receive it?<select name="method"><option value="delivery">Delivery</option><option value="pickup">Collect from the atelier</option></select></label>
<div id="addr" class="frm"><label>Delivery address<input name="address" autocomplete="street-address"></label><label>City<input name="city" autocomplete="address-level2"></label></div>
<label>Measurements or fitting notes (optional)<textarea name="note" rows="3" maxlength="500"></textarea></label>
<p class="msg" id="err" role="alert"></p>
<button class="btn solid" id="pay" type="submit">Pay securely with Paystack</button>
<p class="msg">Any delivery fee is added on the next step, and the final total is shown on the Paystack page. Pay by card or bank transfer.</p>
</form></div>
</div></main>
<script>
(function(){
var d=DOJ,c=d.get(),f=document.getElementById('f'),err=document.getElementById('err');
function fmt(k){var s=(k/100).toFixed(2).split('.');return '\\u20A6'+s[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g,',')+(s[1]==='00'?'':'.'+s[1])}
function draw(){c=d.get();document.getElementById('empty').hidden=c.length>0;document.getElementById('full').hidden=!c.length;
 var b=document.getElementById('bag');b.textContent='';var t=0;
 c.forEach(function(x,i){t+=x.price_kobo*x.qty;var r=document.createElement('div'),a=document.createElement('span'),p=document.createElement('span'),rm=document.createElement('button');
  a.textContent=x.name+' (size '+x.size+')';p.textContent=fmt(x.price_kobo);rm.type='button';rm.textContent='Remove';
  rm.onclick=function(){c.splice(i,1);d.set(c);d.badge();draw()};r.appendChild(a);r.appendChild(p);r.appendChild(rm);b.appendChild(r)});
 var s=document.createElement('div'),l=document.createElement('strong'),v=document.createElement('strong');l.textContent='Items';v.textContent=fmt(t);s.appendChild(l);s.appendChild(v);b.appendChild(s)}
f.method.onchange=function(){document.getElementById('addr').hidden=f.method.value==='pickup'};
f.onsubmit=function(e){e.preventDefault();err.textContent='';var btn=document.getElementById('pay');btn.disabled=true;
 var p={items:c.map(function(x){return{variant_id:x.variant_id,qty:x.qty}}),delivery_method:f.method.value,
  customer:{name:f.name.value,phone:f.phone.value,email:f.email.value,address:f.address.value,city:f.city.value,fitting_note:f.note.value}};
 fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)})
 .then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j}})})
 .then(function(o){if(o.ok&&o.j.authorization_url){location.href=o.j.authorization_url;return}
  var m={sold_out:'Sorry, '+(o.j.item||'a piece in your bag')+' has just sold out. Please remove it and try again.',name_required:'Please enter your name.',phone_invalid:'Please check your phone number.',email_invalid:'Please check your email address.',address_required:'Please enter a delivery address.',empty_cart:'Your bag is empty.'};
  err.textContent=m[o.j.error]||'Something went wrong. Please try again, or message us on WhatsApp.';btn.disabled=false})
 .catch(function(){err.textContent='No connection. Please try again.';btn.disabled=false})};
draw();
})();
</script>`;

export const onRequestGet = () => html(layout({ title: 'Your bag | DOJ Panache', body, noindex: true }), 200, 'no-store');
