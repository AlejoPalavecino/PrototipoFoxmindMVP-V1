"""Build a documentation proposal; never migrate, delete or rewrite inputs.

Outputs only to this script's directory. Baseline excludes these artifacts and
the coordinator's own new record. Recognized links are a Markdown subset;
literal references are review candidates, not an AST/call graph proof.
"""
from pathlib import Path
from urllib.parse import urlsplit, unquote, quote
import collections
import csv
import datetime
import hashlib
import json
import posixpath
import re
import runpy
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ORIGINAL = Path(r'C:\Users\alejo\Documents\ProyectosAlejo\FoxMind\ProtipoFoxMind')
GLASS = Path(r'C:\Users\alejo\.codex\worktrees\foxmind-entry-glass\ProtipoFoxMind')
OWN_RECORD = 'docs/work-log/2026-10-22-root-docs-reorganization-map.md'
HELPERS = ORIGINAL / 'docs/audits/2026-10-21-docs-audit/audit_docs.py'
H = runpy.run_path(str(HELPERS), run_name='read_only_helpers')
links, anchors = H['links'], H['anchors']


def git(root, *args):
    p = subprocess.run(['git', '-C', str(root), *args], capture_output=True, text=True, encoding='utf-8')
    if p.returncode:
        raise RuntimeError(f'Git read failed: {args[0]}')
    return p.stdout


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def rel(p, root=ROOT):
    return p.relative_to(root).as_posix()


def dump(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def csv_out(name, rows, fields):
    with (HERE / name).open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


GROUPS = {
    'engineering/local-development': 'backend.md database.md local-email.md p9-local-operation.md',
    'engineering/identity': 'identity-http.md identity-security.md registration-profile.md account-verification.md password-recovery.md password-change.md p3-web.md account-mail-outbox.md mail-sender.md',
    'engineering/files': 'p4-host.md p4-web.md p4-integration.md',
    'engineering/classrooms': 'p5-host.md p5-web.md p5-integration.md',
    'engineering/teaching': 'p6-teaching.md p6-library.md p6-muro.md',
    'engineering/activities': 'p7-authoring.md p7-participation.md p7-practical-submissions.md p7-questionnaire-attempts.md p7-history-notifications.md',
    'engineering/grading': 'p8-private-grading.md p8-publication.md p8-published-corrections.md p8-progress.md',
    'engineering/home': 'p9-home.md',
    'engineering/testing': 'p3-test-runtime.md p9-runtime-controls.md',
    'engineering/design-system': 'entry-glass.md',
    'verification/p9': 'p9-joined-journeys.md p9-failure-recovery.md p9-verification-plan.md',
    'design': 'visual-reference-index.md',
}
MOVES = {f'docs/{name}': f'docs/{folder}/{name}' for folder, names in GROUPS.items() for name in names.split()}


def immutable(name):
    return (name.startswith('docs/work-log/') and name != 'docs/work-log/README.md') or name.startswith('docs/audits/') or name.endswith('.json') or name in {
        'docs/backend-verification.md', 'docs/database-verification.md', 'docs/dependency-security.md',
        'docs/p4-integration-handoff.md', 'docs/private-files.md', 'docs/classrooms.md'
    }


def reason(name):
    if name in MOVES:
        return 'Agrupar guia; recalcular enlaces salientes y conservar stub + IDs en ruta anterior'
    if name.startswith('docs/work-log/'):
        return 'Conservar ruta y bytes de registros/evidencia; no reescribir historia'
    if name.startswith('docs/references/'):
        return 'Conservar PNG, nombre, hash y rutas de referencias originales'
    if name.startswith('docs/api/'):
        return 'Contrato/esquema estable; OpenAPI tiene lector real en test offline'
    if name in ['docs/p9-acceptance-matrix.md', 'docs/p9-final-row-ledger.json']:
        return 'Ledger/matriz de aceptacion con IDs y proveniencia estables'
    if name == 'docs/foxmind-v1-functional-spec.md':
        return 'Fuente normativa: conservar IDs, secciones, lineas y ruta citada'
    if name in ['docs/README.md', 'docs/implementation-roadmap.md', 'docs/design/README.md']:
        return 'Punto de entrada estable; solo actualizar navegacion cuando se autorice migrar'
    return 'Excepcion estable de contrato o evidencia historica; catalogar sin mover'


def future(name):
    return MOVES.get(name, name)


def new_href(source, target, fragment='', query=''):
    path = quote(posixpath.relpath(target, posixpath.dirname(source) or '.'), safe='/@-._~!$&\'()*+,;=')
    return path + (('?' + query) if query else '') + (('#' + fragment) if fragment else '')


def main():
    docs = sorted(p for p in (ROOT / 'docs').rglob('*') if p.is_file() and HERE not in p.parents and rel(p) != OWN_RECORD)
    sources = {rel(p): p for p in docs}
    assert set(MOVES) <= set(sources), set(MOVES) - set(sources)
    destinations = [future(name) for name in sources]
    assert len(destinations) == len(set(x.casefold() for x in destinations)), 'Destination collision'
    assert not any((ROOT / dst).exists() for src, dst in MOVES.items() if src != dst), 'Occupied new target'
    tracked = set(git(ROOT, 'ls-files', '-z').split('\0'))
    original_docs = sorted(p for p in (ORIGINAL / 'docs').rglob('*') if p.is_file())
    baseline_file = HERE / 'before.json'
    if not baseline_file.exists():
        dump('before.json', {
            'captured_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'main_root': str(ROOT), 'main_head': git(ROOT, 'rev-parse', 'HEAD').strip(),
            'main_status_before': git(ROOT, 'status', '--porcelain=v1', '-uall'),
            'original_root': str(ORIGINAL), 'original_head': git(ORIGINAL, 'rev-parse', 'HEAD').strip(),
            'glass_root': str(GLASS), 'glass_head': git(GLASS, 'rev-parse', 'HEAD').strip(),
            'main_docs': {name: sha(p) for name, p in sources.items()},
            'original_docs': {rel(p, ORIGINAL): sha(p) for p in original_docs},
            'root_and_consumers': {name: sha(ROOT / name) for name in tracked if name and (ROOT / name).is_file() and (name in ['README.md', 'AGENTS.md', 'package.json', 'package-lock.json', 'prisma/schema.prisma'] or name.startswith(('odd/', 'scripts/', 'tests/', 'apps/'))) and not Path(name).name.startswith('.env')},
        })

    mapping = []
    compatibility = []
    for name, p in sources.items():
        moved = name in MOVES
        ids = sorted(anchors(p.read_text(encoding='utf-8-sig'))) if p.suffix == '.md' else []
        batch = 'B3-academic' if any(t in future(name) for t in ['teaching/', 'activities/', 'grading/', 'home/']) else 'B4-validation' if any(t in future(name) for t in ['testing/', 'verification/p9/']) else 'B5-design' if moved and '/design/' in future(name) else 'B2-account-and-local' if moved else 'B0-pinned'
        mapping.append(dict(source=name, destination=future(name), action='proposed_move_with_permanent_compat_stub' if moved else 'keep', batch=batch, tracked=name in tracked, sha256=sha(p), preserve_bytes=not moved, old_path=name, old_anchor_count=len(ids), reason=reason(name)))
        if moved:
            compatibility.append(dict(old_path=name, canonical=future(name), old_ids=ids, strategy='Permanent Markdown stub: explicit IDs, each linking to canonical section. No automatic redirect. No duplicated status or policy.'))
    csv_out('main-map.csv', mapping, ['source','destination','action','batch','tracked','sha256','preserve_bytes','old_path','old_anchor_count','reason'])
    dump('compatibility.json', compatibility)

    # Local design imports are OPTIONAL copies, never moves. Keep family depth,
    # and discover absent work-record dependencies before promising portability.
    copy_sources = {p.resolve() for p in (ORIGINAL / 'docs/design').rglob('*') if p.is_file()}
    pending = list(copy_sources)
    while pending:
        p = pending.pop()
        if p.suffix != '.md':
            continue
        for _, dest in links(p.read_text(encoding='utf-8-sig')):
            u = urlsplit(dest)
            if u.scheme:
                continue
            q = (p.parent / unquote(u.path)).resolve()
            if q.is_file() and q.is_relative_to(ORIGINAL / 'docs/work-log') and not (ROOT / rel(q, ORIGINAL)).exists() and q not in copy_sources:
                copy_sources.add(q)
                pending.append(q)
    local_rows = []
    for p in original_docs:
        name = rel(p, ORIGINAL)
        same = name in sources and sha(p) == sha(sources[name])
        collision = name in sources and not same
        optional = p.resolve() in copy_sources
        existing_design = optional and name in sources
        local_rows.append(dict(workspace='original-P3', source=name, sha256=sha(p), action='keep_existing_copy_compare_provenance_no_overwrite' if existing_design else 'optional_copy_only_if_authorized' if optional else 'keep_external_no_import', proposed_main_destination=name if optional else '', collision='same_hash_existing' if same else 'different_hash_do_not_overwrite' if collision else 'no_main_counterpart', reason='Ya existe copia en main; conservar ambas versiones y revisar diferencias sin fusion automatica' if existing_design else 'Preservar original; misma profundidad para enlaces de familia/registro' if optional else 'No fusionar copias historicas con main; consulta local por registro y hash'))
    brand_root = ORIGINAL.parent / 'archive/marca-original'
    for basename in ['Zorro.png', 'ZorroH.png']:
        p = brand_root / basename
        assert p.is_file(), p
        local_rows.append(dict(workspace='external-original-brand', source=str(p), sha256=sha(p), action='optional_copy_original_asset_only_if_authorized', proposed_main_destination='docs/design/assets/original/' + basename, collision='no_overwrite_preflight_required', reason='Original intacto; licencia/procedencia y sidecar; no sustituir por imagen generada'))
    csv_out('local-preservation-map.csv', local_rows, ['workspace','source','sha256','action','proposed_main_destination','collision','reason'])

    # Scan a finite, secret-free set: current docs + tracked repository sources.
    scan = {name: p for name, p in sources.items() if p.suffix.lower() in ['.md', '.json', '.csv', '.py']}
    for name in tracked:
        p = ROOT / name
        if not name or not p.is_file() or p.name.startswith('.env'):
            continue
        if (name in ['README.md','AGENTS.md','package.json'] or name.startswith(('odd/','scripts/','tests/','apps/','.github/'))) and p.suffix.lower() in ['.md','.mjs','.js','.ts','.tsx','.css','.json','.yaml','.yml','.toml']:
            scan[name] = p
    # A single compiled pattern avoids per-file/per-doc regex recompilation.
    names = [n for n in sources if Path(n).name != 'README.md']
    full_pattern = re.compile('|'.join(re.escape(n) for n in sorted(names, key=len, reverse=True)))
    basename_owner = {Path(n).name: n for n in names}
    basename_pattern = re.compile(r'[\"\'`]([^\"\'`\n]*?(?:' + '|'.join(re.escape(n) for n in sorted(basename_owner, key=len, reverse=True)) + r'))[\"\'`]')
    consumers, link_errors, virtual_errors = [], [], []
    virtual_routes = set(destinations) | set(MOVES)
    for consumer, p in sorted(scan.items()):
        text = p.read_text(encoding='utf-8-sig')
        if p.suffix == '.md':
            for no, href in links(text):
                u = urlsplit(href)
                if u.scheme:
                    continue
                q = ((ROOT / unquote(u.path).lstrip('/')) if u.path.startswith('/') else (p.parent / unquote(u.path))).resolve() if u.path else p.resolve()
                if not q.exists():
                    link_errors.append(dict(source=consumer,line=no,target=href))
                    continue
                if not q.is_relative_to(ROOT):
                    continue
                target = rel(q)
                if target not in sources:
                    # Links to odd/tasks, README, source/tests and directories
                    # also need rebasing when the referring guide relocates.
                    virtual_routes.add(target)
                affected = consumer in MOVES or target in MOVES
                effective = target if immutable(consumer) else future(target)
                rewritten = href if immutable(consumer) else new_href(future(consumer), effective, u.fragment, u.query)
                action = 'retain_history_link_via_compat_stub' if affected and immutable(consumer) else 'rebase_outgoing_and_or_incoming_href' if affected else 'keep'
                consumers.append(dict(consumer=consumer,line=no,kind='markdown_or_html_link',target=target,proposed_target=future(target),future_consumer=future(consumer),future_href=rewritten,affected=affected,action=action))
                if effective not in virtual_routes:
                    virtual_errors.append((consumer,no,target,'missing virtual route'))
                if not immutable(consumer):
                    resolved = posixpath.normpath(posixpath.join(posixpath.dirname(future(consumer)), unquote(urlsplit(rewritten).path)))
                    if resolved != effective:
                        virtual_errors.append((consumer,no,target,'bad rebase'))
                if u.fragment and q.suffix == '.md' and unquote(u.fragment) not in anchors(q.read_text(encoding='utf-8-sig')):
                    virtual_errors.append((consumer,no,target,'anchor not recognized'))
        for no, line in enumerate(text.splitlines(), 1):
            normalized = line.replace('\\\\', '/').replace('\\', '/')
            matches = {m.group(0) for m in full_pattern.finditer(normalized)}
            if p.suffix != '.md':
                for m in basename_pattern.finditer(normalized):
                    for basename, target in basename_owner.items():
                        if m[1].endswith(basename):
                            matches.add(target)
                            break
            for target in sorted(matches):
                affected = consumer in MOVES or target in MOVES
                comment = line.lstrip().startswith(('//','#','/*','*'))
                kind = 'artifact_literal_review' if consumer.startswith('docs/') and p.suffix in ['.json','.csv'] else 'code_comment' if p.suffix != '.md' and comment else 'code_reference_review' if p.suffix != '.md' else 'literal_reference_review'
                action = 'retain_historical_literal_via_stub' if immutable(consumer) else 'manual_context_review_not_global_replace' if affected else 'keep'
                consumers.append(dict(consumer=consumer,line=no,kind=kind,target=target,proposed_target=future(target),future_consumer=future(consumer),future_href='',affected=affected,action=action))
    csv_out('consumers.csv', consumers, ['consumer','line','kind','target','proposed_target','future_consumer','future_href','affected','action'])

    # Dry-run optional copies: internal Markdown links must reach main, stubs or
    # another dependency in the proposed additive copy closure.
    copy_destinations = {rel(p, ORIGINAL) for p in copy_sources}
    optional_errors = []
    for p in copy_sources:
        if p.suffix != '.md':
            continue
        for no, href in links(p.read_text(encoding='utf-8-sig')):
            u = urlsplit(href)
            if u.scheme:
                continue
            q = (p.parent / unquote(u.path)).resolve() if u.path else p
            if not q.is_relative_to(ORIGINAL):
                optional_errors.append((rel(p, ORIGINAL),no,'outside original'))
                continue
            target = rel(q, ORIGINAL)
            if target not in virtual_routes | copy_destinations:
                optional_errors.append((rel(p, ORIGINAL),no,target))
    summary = {
        'generated_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'main_head': git(ROOT,'rev-parse','HEAD').strip(), 'main_docs': len(sources),
        'proposed_moves': len(MOVES), 'pinned_files': len(sources)-len(MOVES),
        'permanent_compat_routes': len(compatibility), 'compat_ids': sum(len(c['old_ids']) for c in compatibility),
        'destination_groups': dict(collections.Counter(str(Path(r['destination']).parent).replace('\\','/') for r in mapping)),
        'scanned_text_files': len(scan), 'reference_rows': len(consumers),
        'reference_kinds': dict(collections.Counter(c['kind'] for c in consumers)),
        'affected_reference_rows': sum(c['affected'] for c in consumers),
        'affected_consumer_files': len({c['consumer'] for c in consumers if c['affected']}),
        'repository_code_references': [c for c in consumers if c['kind'] in ['code_comment','code_reference_review'] and c['consumer'].startswith(('tests/','scripts/','apps/'))],
        'current_link_errors': link_errors, 'virtual_link_errors': virtual_errors,
        'original_files': len(original_docs), 'local_design_files': len(list((ORIGINAL/'docs/design').rglob('*.*'))),
        'design_dependency_closure_files': len(copy_sources),
        'new_optional_design_and_record_copies': sum(not (ROOT/rel(p,ORIGINAL)).exists() for p in copy_sources),
        'existing_design_files_to_keep': sum((ROOT/rel(p,ORIGINAL)).exists() for p in copy_sources),
        'optional_historical_record_dependencies': sorted(rel(p,ORIGINAL) for p in copy_sources if p.is_relative_to(ORIGINAL/'docs/work-log')),
        'optional_brand_asset_copies': 2, 'optional_copy_link_errors': optional_errors,
        'casefold_destination_collisions': 0, 'occupied_new_destinations': 0,
        'no_migration_executed': True,
        'limitations': ['Markdown subset, not CommonMark/AST/dataflow proof.', 'Literal/comment rows can overlap structured-link rows; counts are not unique references.', 'No web requests, runtime tests or migration commands.', 'External provenance paths and dynamic references require future manual review.', 'Current working-tree bytes include uncommitted stage1 edits, not only main HEAD.', 'Generator depends on the preserved local prior audit helper; no claimed portable tooling.'],
    }
    dump('checks.json', summary)
    assert not link_errors and not virtual_errors and not optional_errors, 'See checks.json; map not validated'
    print(json.dumps({k:v for k,v in summary.items() if k not in ['destination_groups','limitations']},ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
