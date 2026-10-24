import { html, layout, WA } from '../_lib/page.js';

const body = `<main class="pg"><div class="w">
<h1 id="h">Confirming your payment</h1>
<p class="lead" id="s">One moment while we check with Paystack.</p>
<p class="more"><a class="btn" id="w" href="${WA}">Message us on WhatsApp</a></p>
</div></main>
<script>
(function(){
var ref=new URLSearchParams(location.search).get('ref')||'',h=document.getElementById('h'),s=document.getElementById('s'),n=0;
document.getElementById('w').href='https://wa.me/2348133464931?text='+encodeURIComponent('Hello DOJ Panache, my order reference is '+ref+'.');
function say(a,b){h.textContent=a;s.textContent=b}
function go(){fetch('/api/order-status?ref='+encodeURIComponent(ref)).then(function(r){return r.json()}).then(function(o){
 var st=o.status;
 if(['paid','packed','shipped','delivered'].indexOf(st)>-1){DOJ.set([]);DOJ.badge();say('Thank you','Payment received for order '+ref+'. We will contact you on the phone number you gave to arrange '+(o.delivery_method==='pickup'?'collection':'delivery')+'.');return}
 if(st==='needs_attention'){say('We are checking your order','Your payment came through, but we need to confirm the piece is still available. We will contact you today. Reference: '+ref);return}
 if(st==='pending'&&n++<20){setTimeout(go,3000);return}
 if(st==='pending'){say('Still confirming','If you were charged, please message us with your reference: '+ref);return}
 if(o.error==='not_found'||o.error==='bad_ref'){say('Order not found','We could not find that order. If you paid, please message us.');return}
 say('This order did not go through','If you were charged, please message us with your reference ('+ref+') and we will sort it out.')
}).catch(function(){if(n++<20)setTimeout(go,3000)})}
go();
})();
</script>`;

export const onRequestGet = () => html(layout({ title: 'Order status | DOJ Panache', body, noindex: true }), 200, 'no-store');
