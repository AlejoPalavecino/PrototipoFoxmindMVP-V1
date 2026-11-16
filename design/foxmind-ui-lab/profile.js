/* Mi perfil de la maqueta. Los borradores quedan en memoria hasta confirmar el guardado. */
const pfAvatars = {
  photo: 'Foto de la demo',
  initials: 'Mis iniciales',
  'foxy-classic': 'Foxy clásico',
  'foxy-reader': 'Foxy lector',
  'foxy-explorer': 'Foxy explorador',
  'foxy-creative': 'Foxy creativo'
};
const pfDrafts = new Map();
const pfDefaultDetails = { surname: 'Demo', avatar: 'photo' };

function pfInit() {
  state.profileDetails ??= {};
  for (const r of ['docente', 'estudiante']) {
    state.profileDetails[r] = { ...pfDefaultDetails, ...state.profileDetails[r] };
  }
}

function pfSaved(r) {
  const { surname, avatar } = state.profileDetails?.[r] ?? pfDefaultDetails;
  return { name: state.profile[r], surname, avatar: Object.hasOwn(pfAvatars, avatar) ? avatar : 'photo' };
}

function pfDraft() {
  if (!pfDrafts.has(role)) pfDrafts.set(role, pfSaved(role));
  return pfDrafts.get(role);
}

function pfDisplayName(r = role) {
  const { name, surname } = pfSaved(r);
  return name + ' ' + surname;
}

function pfAvatarFor(r, { name, surname, avatar }) {
  const asset = avatar === 'photo' ? 'profile-' + r : avatar;
  if (avatar !== 'initials' && ASSETS[asset]) {
    return img(asset, 'profile-photo pf-avatar-' + avatar);
  }
  const letters = [name, surname].map(value => Array.from(value.trim())[0] ?? '').join('').toLocaleUpperCase('es');
  return '<span class="profile-photo pf-avatar-initials" aria-hidden="true">' + esc(letters || '·') + '</span>';
}

function pfAvatarMarkup(r = role) {
  return pfAvatarFor(r, pfSaved(r));
}

function pfDirty(draft) {
  const saved = pfSaved(role);
  return Object.keys(saved).some(key => saved[key] !== draft[key]);
}

function pfNameField(key, label, value, autocomplete) {
  return '<div><label for="pf-' + key + '">' + label + '</label>'
    + '<input id="pf-' + key + '" name="' + key + '" autocomplete="' + autocomplete + '" value="' + esc(value) + '" required aria-describedby="pf-name-hint pf-' + key + '-error">'
    + '<p class="field-error" id="pf-' + key + '-error" hidden></p></div>';
}

function pfProfileScreen() {
  const draft = pfDraft();
  const roleLabel = role === 'docente' ? 'Docente' : 'Estudiante';
  const dirty = pfDirty(draft);
  return '<div class="pf-page">' + pageHead('Mi perfil', 'Elegí cómo te ven en FoxMind.')
    + '<div class="pf-layout">'
    + '<form class="panel pf-form" data-form="demo-profile" novalidate aria-labelledby="pf-details">'
    + '<section class="pf-identity" aria-label="Vista previa de tu perfil">'
    + '<div id="pf-live-avatar" class="pf-portrait">' + pfAvatarFor(role, draft) + '</div>'
    + '<div class="pf-identity-copy"><p class="pf-preview-label">Vista previa</p>'
    + '<p id="pf-preview-name" class="pf-display-name">' + esc(pfPreviewName(draft)) + '</p>'
    + '<button type="button" class="button" data-pf-action="avatar" aria-haspopup="dialog">' + icon('edit') + 'Cambiar avatar</button></div></section>'
    + '<div class="pf-form-content"><h2 id="pf-details">Datos de perfil</h2>'
    + '<p id="pf-name-hint" class="pf-name-hint">Hasta 80 caracteres por nombre y apellido.</p>'
    + '<div class="pf-fields">'
    + pfNameField('name', 'Nombre', draft.name, 'given-name')
    + pfNameField('surname', 'Apellido', draft.surname, 'family-name')
    + '<div><label for="pf-email">Correo electrónico</label><input id="pf-email" type="email" value="' + role + '@foxmind.example" readonly></div>'
    + '<div><label for="pf-role">Rol</label><input id="pf-role" value="' + roleLabel + '" readonly></div></div>'
    + '<div id="pf-save-error" class="notice error" role="alert" hidden></div>'
    + '<footer class="pf-save"><p id="pf-draft-status" class="small" role="status">' + pfDraftStatus(dirty) + '</p>'
    + '<div class="pf-actions"><button type="button" class="button quiet" data-pf-action="discard"' + (dirty ? '' : ' disabled') + '>Descartar cambios</button>'
    + '<button type="submit" class="button primary"' + (dirty ? '' : ' disabled') + '>Guardar cambios</button></div></footer></div></form>'
    + '<aside class="panel pf-account" aria-labelledby="pf-account-title">'
    + '<span class="pf-account-mark">' + icon('shield') + '</span><h2 id="pf-account-title">Configuración de cuenta</h2>'
    + '<p>Estás usando una cuenta de demostración. Los cambios de perfil se guardan en este navegador.</p>'
    + '<div class="pf-account-rule"><b>' + icon('lock') + 'Contraseña y sesión</b>'
    + '<p>Podés gestionarlas en FoxMind. Esta maqueta usa cuentas de ejemplo y no solicita credenciales.</p></div></aside></div></div>';
}

function pfPreviewName({ name, surname }) {
  return [name, surname].filter(value => value.trim()).join(' ') || 'Tu nombre';
}

function pfDraftStatus(dirty) {
  return dirty ? 'Tenés cambios sin guardar.' : 'Tu perfil está al día.';
}

function pfRefresh(form, draft) {
  const dirty = pfDirty(draft);
  form.querySelector('#pf-live-avatar').innerHTML = pfAvatarFor(role, draft);
  form.querySelector('#pf-preview-name').textContent = pfPreviewName(draft);
  const status = form.querySelector('#pf-draft-status');
  const message = pfDraftStatus(dirty);
  if (status.textContent !== message) status.textContent = message;
  for (const button of form.querySelectorAll('.pf-actions button')) button.disabled = !dirty;
}

function pfShowPicker() {
  const draft = pfDraft();
  showDialog('Elegí tu avatar', 'Confirmá la vista previa y guardá el perfil para aplicar el cambio.',
    '<div class="pf-picker-preview"><span id="pf-picker-image" class="pf-portrait">' + pfAvatarFor(role, draft) + '</span>'
    + '<b id="pf-picker-label">' + pfAvatars[draft.avatar] + '</b></div>'
    + '<fieldset class="pf-options"><legend class="sr-only">Opciones de avatar</legend>'
    + Object.entries(pfAvatars).map(([key, label]) =>
      '<label class="pf-option"><input type="radio" name="pf-avatar" value="' + key + '"' + (draft.avatar === key ? ' checked' : '') + '>'
      + pfAvatarFor(role, { ...draft, avatar: key }) + '<span>' + label + '</span></label>').join('')
    + '</fieldset>',
    btn('Cancelar', 'close') + '<button type="button" class="button primary" data-pf-action="confirm-avatar">Usar este avatar</button>');
  $('#dialog').classList.add('pf-picker');
}

function pfFieldError(field, message = '') {
  const error = $('#' + field.id + '-error');
  error.textContent = message;
  error.hidden = !message;
  if (message) field.setAttribute('aria-invalid', 'true');
  else field.removeAttribute('aria-invalid');
}

function pfSave(form) {
  const draft = pfDraft();
  if (!pfDirty(draft)) return;
  let firstInvalid;
  for (const [key, label] of [['name', 'nombre'], ['surname', 'apellido']]) {
    const field = form.elements[key];
    const value = draft[key];
    const message = !value.trim() ? 'Completá tu ' + label + '.'
      : Array.from(value).length > 80 ? 'Usá hasta 80 caracteres.'
      : /[\uD800-\uDFFF]/u.test(value) ? 'Revisá los caracteres de tu ' + label + '.' : '';
    pfFieldError(field, message);
    if (message) firstInvalid ??= field;
  }
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  const oldDetails = state.profileDetails;
  const oldName = state.profile[role];
  const { name, surname, avatar } = draft;
  state.profile[role] = name;
  state.profileDetails = { ...oldDetails, [role]: { surname, avatar } };
  if (!save()) {
    state.profile[role] = oldName;
    state.profileDetails = oldDetails;
    const error = form.querySelector('#pf-save-error');
    error.textContent = 'No pudimos guardar tu perfil en este navegador. Tus cambios siguen acá para que vuelvas a intentarlo.';
    error.hidden = false;
    return;
  }
  pfDrafts.delete(role);
  render();
  toast('Guardaste los cambios de tu perfil.', 'success');
}

function installProfile() {
  pfInit();
  // A failed save in another screen may replace state. Only a confirmed demo reset clears both drafts.
  const resetExample = actions['confirm-reset'];
  actions['confirm-reset'] = button => {
    resetExample(button);
    if (storageAvailable) pfDrafts.clear();
  };
  document.addEventListener('click', e => {
    const action = e.target.closest('[data-pf-action]')?.dataset.pfAction;
    const form = $('form[data-form="demo-profile"]');
    if (!action || !form) return;
    if (action === 'avatar') pfShowPicker();
    if (action === 'confirm-avatar') {
      const selected = $('#dialog input[name="pf-avatar"]:checked');
      if (!selected || !Object.hasOwn(pfAvatars, selected.value)) return;
      const draft = pfDraft();
      draft.avatar = selected.value;
      pfRefresh(form, draft);
      closeDialog();
    }
    if (action === 'discard') {
      pfDrafts.delete(role);
      const draft = pfDraft();
      for (const key of ['name', 'surname']) {
        form.elements[key].value = draft[key];
        pfFieldError(form.elements[key]);
      }
      form.querySelector('#pf-save-error').hidden = true;
      pfRefresh(form, draft);
      form.elements.name.focus();
    }
  });
  document.addEventListener('input', e => {
    const field = e.target;
    const form = field.form;
    if (form?.dataset.form !== 'demo-profile' || !['name', 'surname'].includes(field.name)) return;
    const draft = pfDraft();
    draft[field.name] = field.value;
    pfFieldError(field);
    pfRefresh(form, draft);
  });
  $('#dialog').addEventListener('change', e => {
    const { name, value } = e.target;
    if (name !== 'pf-avatar' || !Object.hasOwn(pfAvatars, value)) return;
    $('#pf-picker-image').innerHTML = pfAvatarFor(role, { ...pfDraft(), avatar: value });
    $('#pf-picker-label').textContent = pfAvatars[value];
  });
  document.addEventListener('submit', e => {
    if (e.target.dataset.form !== 'demo-profile') return;
    e.preventDefault();
    e.stopPropagation();
    pfSave(e.target);
  }, true);
}
