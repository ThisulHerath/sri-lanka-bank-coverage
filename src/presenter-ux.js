const navToggle=document.querySelector('.nav-collapse');
function renderNav(collapsed){document.body.classList.toggle('presenter-nav-small',collapsed);navToggle.setAttribute('aria-expanded',String(!collapsed));navToggle.setAttribute('aria-label',collapsed?'Expand navigation':'Minimize navigation');}
try{renderNav(localStorage.getItem('presenter-navigation-small')==='true');}catch{}
navToggle.addEventListener('click',()=>{const collapsed=!document.body.classList.contains('presenter-nav-small');renderNav(collapsed);try{localStorage.setItem('presenter-navigation-small',String(collapsed));}catch{}});
const topButton=document.querySelector('[data-back-top]');
function showTop(){topButton.hidden=window.scrollY<650;}
window.addEventListener('scroll',showTop,{passive:true});showTop();
topButton.addEventListener('click',()=>{window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});});
document.querySelectorAll('.presenter-unlock-fields').forEach(fields=>{
 const input=fields.querySelector('input');const button=document.createElement('button');button.type='button';button.className='button secondary password-visibility';button.textContent='Show';button.setAttribute('aria-label','Show presenter password');button.setAttribute('aria-pressed','false');fields.insertBefore(button,fields.querySelector('button'));
 button.addEventListener('click',()=>{const visible=input.type==='password';input.type=visible?'text':'password';button.textContent=visible?'Hide':'Show';button.setAttribute('aria-pressed',String(visible));button.setAttribute('aria-label',visible?'Hide presenter password':'Show presenter password');});
 const form=fields.closest('form'),submit=fields.querySelector('button[type="submit"],button:not([type])');
 if(submit){const label=submit.textContent;new MutationObserver(()=>{submit.textContent=submit.disabled?'Opening…':label;form.setAttribute('aria-busy',String(submit.disabled));}).observe(submit,{attributes:true,attributeFilter:['disabled']});}
});
