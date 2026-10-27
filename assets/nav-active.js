// Marks the nav link for the current page (desktop and mobile menus) with aria-current and .is-current.
(function(){
  var path=location.pathname.replace(/\/+$/,'')||'/';
  if(/\.html$/.test(path))path=path.slice(0,-5);
  var inBlog=/^\/blog-/.test(path);
  document.querySelectorAll('#nav a[href], #mobileNav a[href]').forEach(function(a){
    var h=a.getAttribute('href');
    if(!h||h.charAt(0)!=='/'||h.indexOf('#')>-1)return;
    var t=h.replace(/\/+$/,'')||'/';
    if(t==='/')return;
    if(t===path||(inBlog&&t==='/blog')){
      a.setAttribute('aria-current','page');
      a.classList.add('is-current');
      var dd=a.closest('.nav-dropdown');
      if(dd){var trigger=dd.querySelector(':scope > a');if(trigger)trigger.classList.add('is-current');}
    }
  });
})();
