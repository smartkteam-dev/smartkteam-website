// ============ CANVAS HERO ANIMATION ============
(function(){
  const canvas = document.getElementById('heroCanvas');
  if(!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], lines = [];
  const ACCENT = 'rgba(232,82,26,';
  const LIGHT = 'rgba(240,115,64,';
  const WHITE = 'rgba(255,255,255,';

  function resize(){
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  class Particle {
    constructor(){this.reset(true);}
    reset(init){
      this.x = Math.random()*W;
      this.y = init ? Math.random()*H : H+10;
      this.size = Math.random()*2.5+0.8;
      this.speedX = (Math.random()-0.5)*0.6;
      this.speedY = -(Math.random()*0.9+0.3);
      this.life = 0;
      this.maxLife = Math.random()*280+160;
      this.color = Math.random()>0.6 ? ACCENT : Math.random()>0.5 ? LIGHT : WHITE;
    }
    update(){
      this.x += this.speedX;
      this.y += this.speedY;
      this.life++;
      if(this.life>this.maxLife||this.y<-10) this.reset(false);
    }
    draw(){
      const alpha = Math.sin((this.life/this.maxLife)*Math.PI)*0.9;
      ctx.beginPath();
      ctx.arc(this.x,this.y,this.size,0,Math.PI*2);
      ctx.fillStyle = this.color+alpha+')';
      ctx.fill();
    }
  }

  class FlowLine {
    constructor(){this.reset();}
    reset(){
      this.x = Math.random()*W;
      this.y = H+20;
      this.width = Math.random()*2+0.5;
      this.speed = Math.random()*1.8+0.6;
      this.length = Math.random()*140+80;
      this.alpha = Math.random()*0.5+0.15;
      this.color = Math.random()>0.5 ? ACCENT : LIGHT;
    }
    update(){
      this.y -= this.speed;
      if(this.y+this.length < 0) this.reset();
    }
    draw(){
      const grad = ctx.createLinearGradient(this.x,this.y+this.length,this.x,this.y);
      grad.addColorStop(0,'transparent');
      grad.addColorStop(0.4,this.color+this.alpha*0.6+')');
      grad.addColorStop(1,this.color+this.alpha+')');
      ctx.beginPath();
      ctx.moveTo(this.x,this.y+this.length);
      ctx.lineTo(this.x,this.y);
      ctx.strokeStyle=grad;
      ctx.lineWidth=this.width;
      ctx.stroke();
    }
  }

  function drawGrid(){
    const spacing = 64;
    const cols = Math.ceil(W/spacing)+1;
    const rows = Math.ceil(H/spacing)+1;
    const t = Date.now()*0.0008;
    for(let i=0;i<cols;i++){
      for(let j=0;j<rows;j++){
        const x=i*spacing;const y=j*spacing;
        const wave=Math.sin(i*0.3+t)*Math.cos(j*0.25+t*0.7);
        const alpha=0.06+wave*0.03;
        ctx.beginPath();
        ctx.arc(x,y,1.2,0,Math.PI*2);
        ctx.fillStyle=WHITE+Math.max(0,alpha)+')';
        ctx.fill();
      }
    }
  }

  function init(){
    resize();
    for(let i=0;i<120;i++) particles.push(new Particle());
    for(let i=0;i<30;i++) lines.push(new FlowLine());
  }

  let heroVisible=true, heroRunning=false;
  function animate(){
    if(!heroVisible){heroRunning=false;return;}
    heroRunning=true;
    ctx.clearRect(0,0,W,H);
    drawGrid();
    lines.forEach(l=>{l.update();l.draw();});
    particles.forEach(p=>{p.update();p.draw();});
    for(let i=0;i<particles.length;i++){
      for(let j=i+1;j<particles.length;j++){
        const dx=particles[i].x-particles[j].x;
        const dy=particles[i].y-particles[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<90){
          const alpha=(1-dist/90)*0.15;
          ctx.beginPath();
          ctx.moveTo(particles[i].x,particles[i].y);
          ctx.lineTo(particles[j].x,particles[j].y);
          ctx.strokeStyle=ACCENT+alpha+')';
          ctx.lineWidth=0.6;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize',()=>{
    resize();
    particles=[]; lines=[];
    for(let i=0;i<120;i++) particles.push(new Particle());
    for(let i=0;i<30;i++) lines.push(new FlowLine());
  });
  init();
  animate();
  new IntersectionObserver(es=>{heroVisible=es[0].isIntersecting;if(heroVisible&&!heroRunning)animate();}).observe(canvas);
})();

// ============ SLIDESHOW ============
(function(){
  const slides = document.querySelectorAll('#mainSlideshow .slide');
  const dotsContainer = document.getElementById('slideDots');
  if(!slides.length || !dotsContainer) return;
  let current = 0, timer;

  // Build dots
  slides.forEach((_,i)=>{
    const d = document.createElement('button');
    d.type = 'button';
    d.setAttribute('aria-label','Go to slide '+(i+1));
    d.className = 'slide-dot'+(i===0?' active':'');
    d.onclick = ()=>goTo(i);
    dotsContainer.appendChild(d);
  });

  function goTo(n){
    slides[current].classList.remove('active');
    dotsContainer.children[current].classList.remove('active');
    current = (n+slides.length)%slides.length;
    slides[current].classList.add('active');
    dotsContainer.children[current].classList.add('active');
    clearInterval(timer);
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(()=>goTo(current+1), 5000);
  }

  window.slideMove = (dir)=>goTo(current+dir);
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(()=>goTo(current+1), 5000);
})();

// ============ MOBILE NAV ============
function toggleMobileNav(){
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  hamburger.classList.toggle('open');
  mobileNav.classList.toggle('open');
  document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
}
function closeMobileNav(){
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('mobileNav').classList.remove('open');
  document.body.style.overflow = '';
}

// ============ CURSOR ============
const cursor=document.getElementById('cursor'),ring=document.getElementById('cursorRing');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
(function anim(){
  cursor.style.left=mx+'px';cursor.style.top=my+'px';
  rx+=(mx-rx)*0.1;ry+=(my-ry)*0.1;
  ring.style.left=rx+'px';ring.style.top=ry+'px';
  requestAnimationFrame(anim);
})();
document.querySelectorAll('a,button,.service-card,.faq-question,.pkg-cta,.why-item').forEach(el=>{
  el.addEventListener('mouseenter',()=>ring.classList.add('hover'));
  el.addEventListener('mouseleave',()=>ring.classList.remove('hover'));
});

// ============ NAV LOGO COLOR ============
function updateLogoColor(){
  const textEl = document.querySelector('.logo-text-path');
  if(!textEl) return;
  if(nav.classList.contains('scrolled')){
    textEl.setAttribute('fill','#1a1a2e');
  } else {
    textEl.setAttribute('fill','#faf9f7');
  }
}

// ============ NAV ============
const nav=document.getElementById('nav');
let currentPage='home';
window.addEventListener('scroll',()=>{
  if(window.scrollY>60){nav.classList.add('scrolled');nav.classList.remove('dark-nav');}
  else{nav.classList.remove('scrolled');if(currentPage!=='home')nav.classList.add('dark-nav');}
  updateLogoColor();
});

// ============ ROUTING (real URLs now) ============
function showPage(id){
  // Legacy bridge for any inline onclick handlers — navigates by URL.
  var map={home:'/',website:'/website-design',seo:'/seo',booking:'/booking-payment',ads:'/google-ads',qa:'/qa',blog:'/blog'};
  if(map[id]) window.location.href=map[id];
}
function scrollAfter(id){
  var el=document.getElementById(id);
  if(el){el.scrollIntoView({behavior:'smooth'});}
  else{window.location.href='/#'+id;}
}
// Handle hash on initial load (e.g., /#contact)
if(window.location.hash){
  setTimeout(function(){
    var el=document.getElementById(window.location.hash.substring(1));
    if(el)el.scrollIntoView({behavior:'smooth'});
  },300);
}

// ============ REVEAL ============
function initReveal(){
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}});
  },{threshold:0.08});
  document.querySelectorAll('.reveal:not(.visible)').forEach(r=>obs.observe(r));
}
initReveal();

// ============ DROPDOWN CLOSE ON CLICK ============
document.querySelectorAll('.nav-dropdown-menu a').forEach(function(link){
  link.addEventListener('click', function(){
    var dd = this.closest('.nav-dropdown');
    if(dd){ dd.blur(); document.activeElement.blur(); }
    var menu = this.closest('.nav-dropdown-menu');
    if(menu){ menu.style.display='none'; setTimeout(function(){ menu.style.display=''; }, 400); }
  });
});

// ============ FAQ ============
function toggleFaq(el){
  const item=el.parentElement,isOpen=item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i=>{
    i.classList.remove('open');
    i.querySelector('.faq-answer').style.maxHeight='0';
  });
  if(!isOpen){
    item.classList.add('open');
    item.querySelector('.faq-answer').style.maxHeight=item.querySelector('.faq-answer-inner').scrollHeight+'px';
  }
}
