// Consultation form (partials/contact-form.html), used on the home page and /free-consultation.
// Posts to /api/contact and reports a successful send to Google Analytics as "generate_lead".
async function submitContactForm(){
  const form = document.getElementById('contactForm');
  const successDiv = document.getElementById('formSuccess');
  const submitBtn = form.querySelector('.btn-submit');

  const fields = [
    { id:'fname', fieldId:'field-fname', validate: v => v.length > 0 },
    { id:'lname', fieldId:'field-lname', validate: v => v.length > 0 },
    { id:'bname', fieldId:'field-bname', validate: v => v.length > 0 },
    { id:'email', fieldId:'field-email', validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
    { id:'service', fieldId:'field-service', validate: v => v.length > 0 },
    { id:'message', fieldId:'field-message', validate: v => v.length > 0 },
  ];

  // Validate all fields, mark errors individually
  let valid = true;
  fields.forEach(f => {
    const val = document.getElementById(f.id).value.trim();
    const fieldEl = document.getElementById(f.fieldId);
    if(!f.validate(val)){
      fieldEl.classList.add('has-error');
      valid = false;
    } else {
      fieldEl.classList.remove('has-error');
    }
  });

  // Clear error on input
  fields.forEach(f => {
    document.getElementById(f.id).addEventListener('input', () => {
      document.getElementById(f.fieldId).classList.remove('has-error');
    }, {once: true});
  });

  if(!valid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try{
    const [firstName,lastName,businessName,email,service,message] = fields.map(f =>
      document.getElementById(f.id).value.trim()
    );

    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({firstName,lastName,businessName,email,service,message,website:document.getElementById('website').value})
    });

    const result = await response.json();

    if(response.ok){
      form.reset();
      // Clear any lingering errors and show success
      fields.forEach(f => document.getElementById(f.fieldId).classList.remove('has-error'));
      successDiv.style.display = 'block';
      if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { form_id: 'contact', service: service, page_path: location.pathname });
      successDiv.scrollIntoView({behavior:'smooth', block:'nearest'});
    } else {
      throw new Error(result.error || 'Failed to send message');
    }
  } catch(error){
    const firstField = document.getElementById('field-fname');
    firstField.classList.add('has-error');
    firstField.querySelector('.field-error-msg').textContent = 'Error: '+error.message+'. Please try again.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Message';
  }
}

