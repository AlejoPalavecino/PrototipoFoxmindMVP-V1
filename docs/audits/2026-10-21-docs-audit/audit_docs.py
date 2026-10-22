"""Read-only docs scan. Writes evidence only to this audit's directory.

Python stdlib only. This is a bounded Markdown-link scanner, not a CommonMark
renderer: inline/reference Markdown and quoted HTML href/src are recognized.
Fences and inline code are ignored. External URLs are counted, never fetched.
Anchor checks approximate GitHub slugs; candidates require human review.
"""
from pathlib import Path
import collections
import csv
from datetime import datetime, timezone
import hashlib
import json
import re
import struct
import subprocess
import sys
from urllib.parse import unquote, urlsplit

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DOCS = ROOT / 'docs'
OWN_LOG = DOCS / 'work-log/2026-10-21-root-docs-audit.md'


def git(*args):
    p = subprocess.run(['git', '-C', str(ROOT), *args], capture_output=True, encoding='utf-8')
    if p.returncode:
        raise RuntimeError('Git metadata command failed: ' + args[0])
    return p.stdout


def visible(text):
    """Remove fenced/inline code without changing line numbers."""
    out, fence = [], None
    for line in text.splitlines():
        m = re.match(r'^\s{0,3}(`{3,}|~{3,})', line)
        if m:
            if fence is None:
                fence = (m[1][0], len(m[1]))
            elif m[1][0] == fence[0] and len(m[1]) >= fence[1]:
                fence = None
            out.append('')
        elif fence:
            out.append('')
        else:
            out.append(re.sub(r'(`+).*?\1', '', line))
    return out


def links(text):
    lines = visible(text)
    refs = {}
    for line in lines:
        m = re.match(r'^\s{0,3}\[([^]]+)\]:\s*(?:<([^>]+)>|(\S+))', line)
        if m:
            refs[m[1].lower()] = m[2] or m[3]
    for no, line in enumerate(lines, 1):
        if re.match(r'^\s{0,3}\[[^]]+\]:', line):
            continue
        # Balanced parentheses in destinations, with optional quoted title.
        for m in re.finditer(r'!?\[[^\n]*?\]\(\s*', line):
            start = m.end()
            if start < len(line) and line[start] == '<':
                end = line.find('>', start + 1)
                if end >= 0:
                    yield no, line[start + 1:end]
                continue
            end, depth = start, 1
            while end < len(line):
                c = line[end]
                if c == '\\':
                    end += 2
                    continue
                if c == '(':
                    depth += 1
                if c == ')':
                    depth -= 1
                    if depth == 0:
                        break
                end += 1
            if depth == 0:
                dest = re.split(r'\s+[\"\']', line[start:end].strip(), maxsplit=1)[0]
                yield no, dest
        for m in re.finditer(r'!?\[([^]\n]+)\]\[([^]\n]*)\]', line):
            key = (m[2] or m[1]).lower()
            yield no, refs.get(key, 'UNRESOLVED_REFERENCE:' + key)
        for m in re.finditer(r'\b(?:href|src)=[\"\']([^\"\']+)[\"\']', line):
            yield no, m[1]


def anchors(text):
    result = set(re.findall(r'\bid=[\"\']([^\"\']+)[\"\']', text))
    counts = collections.Counter()
    for line in visible(text):
        m = re.match(r'^\s{0,3}#{1,6}\s+(.+?)\s*#*$', line)
        if not m:
            continue
        heading = re.sub(r'<[^>]+>', '', m[1]).lower()
        heading = re.sub(r'[^\w\-\s]', '', heading).replace(' ', '-')
        n = counts[heading]
        counts[heading] += 1
        result.add(heading + (f'-{n}' if n else ''))
    return result


def classify(rel):
    p = Path(rel)
    name = p.name
    if rel.startswith('docs/work-log/'):
        phase = 'P3' if re.search(r'p3|p31|p32|p33|p34|recovery|prisma|build-once|sequential|fixture|t2-closure|t3-verification', name) else 'transversal'
        if 'p4-' in name: phase = 'P4/preparación'
        if 'p5-' in name: phase = 'P5/viabilidad'
        if '2026-10-21' in name: phase = 'diseño/exploración'
        return 'protocolo' if name == 'README.md' else 'registro histórico', phase, 'conservar; indexar, no reescribir historial', 'docs/work-log/'
    if rel.startswith('docs/references/'):
        return 'referencia visual', 'P0', 'conservar nombre/hash; enlazar catálogo', 'docs/design/references/'
    if rel.startswith('docs/design/'):
        family = p.parts[2]
        return 'propuesta visual estática', 'diseño propuesto', 'conservar familia; añadir estado/decisión de diseño', f'docs/design/proposals/{family}/'
    if name == 'foxmind-v1-functional-spec.md':
        return 'especificación normativa', 'V1/P0–P9', 'conservar reglas; separar prólogo histórico/índice', 'docs/product/'
    if name == 'implementation-roadmap.md':
        return 'estado/planificación', 'P0–P9 por rama', 'reconciliar base; separar estado actual e historia', 'docs/ (entrada estable)'
    if name == 'visual-reference-index.md':
        return 'catálogo visual normativo', 'P0/diseño', 'conectar familias/propuestas sin aprobarlas', 'docs/design/'
    if rel.startswith('docs/api/'):
        return 'contrato API', 'P3', 'conservar contrato/OpenAPI; corregir metadatos contradictorios', 'docs/api/'
    if name in ['backend-verification.md','database-verification.md','dependency-security.md']:
        return 'evidencia de verificación', 'P2' if name != 'account-verification.md' else 'P3', 'fechar candidato; enlazar desde resumen sin duplicar PASS', 'docs/verification/'
    if name == 'p3-test-runtime.md':
        return 'guía de pruebas', 'P3', 'conservar límites actuales; enlazar historial', 'docs/engineering/testing/'
    if name in ['database.md','backend.md','local-email.md']:
        return 'guía operativa', 'P2/P3', 'actualizar alcance/quick path; evitar estado global duplicado', 'docs/engineering/local-development/'
    return 'guía técnica de componente', 'P3', 'conservar detalle; reconciliar estado e integración', 'docs/engineering/identity/'


def self_test():
    fixture = '[a](a.md#x)\n`[no](missing)`\n```md\n[no](missing)\n```\n[b](folder/a(b).md)\n[r][id]\n[id]: target.md\n![i](<a b.png>)'
    assert list(links(fixture)) == [(1,'a.md#x'),(6,'folder/a(b).md'),(7,'target.md'),(9,'a b.png')]
    assert 'hola-mundo' in anchors('# Hola mundo\n')
    assert {'same','same-1'} <= anchors('# Same\n# Same\n')
    assert 'old-anchor' in anchors('<a id="old-anchor"></a>')


def structural_checks(paths):
    markdown = [p for p in paths if p.suffix == '.md']
    missing_h1, tables = [], []
    for p in markdown:
        lines = visible(p.read_text(encoding='utf-8-sig'))
        if not any(l.startswith('# ') for l in lines):
            missing_h1.append(p.relative_to(ROOT).as_posix())
        expected = None
        for no, line in enumerate(lines, 1):
            if not line.strip().startswith('|'):
                expected = None
                continue
            cells = len(re.split(r'(?<!\\)\|', line.strip().strip('|')))
            if re.match(r'^\|\s*:?-{3,}', line.strip()):
                expected = cells
            elif expected and cells != expected:
                tables.append(dict(source=p.relative_to(ROOT).as_posix(),line=no,expected=expected,actual=cells))
    guides = [p for p in markdown if p.parent in [DOCS,DOCS/'api']]
    scripts, npm = set(), set()
    for p in guides:
        text = p.read_text(encoding='utf-8-sig')
        scripts.update(re.findall(r'\bnode (scripts/[A-Za-z0-9_.-]+\.mjs)', text))
        npm.update(re.findall(r'\bnpm run ([a-zA-Z0-9:_-]+)', text))
    package = json.loads((ROOT/'package.json').read_text(encoding='utf-8-sig'))
    api = json.loads((DOCS/'api/accounts-sessions.openapi.json').read_text(encoding='utf-8-sig'))
    refs, bad_refs = [], []

    def walk(obj):
        if isinstance(obj, dict):
            if '$ref' in obj:
                ref = obj['$ref']
                refs.append(ref)
                if ref.startswith('#/'):
                    current = api
                    try:
                        for key in ref[2:].split('/'):
                            current = current[key.replace('~1','/').replace('~0','~')]
                    except (KeyError, TypeError):
                        bad_refs.append(ref)
            for value in obj.values(): walk(value)
        elif isinstance(obj, list):
            for value in obj: walk(value)

    walk(api)
    operations = [op for methods in api['paths'].values() for verb, op in methods.items() if verb in ['get','post','put','patch','delete']]
    return dict(markdown_lines=sum(len(p.read_text(encoding='utf-8-sig').splitlines()) for p in markdown),missing_h1=missing_h1,table_candidates=tables,guide_node_script_targets=len(scripts),missing_script_targets=sorted(s for s in scripts if not (ROOT/s).is_file()),guide_npm_run_names=len(npm),missing_npm_run_names=sorted(npm-set(package['scripts'])),openapi_refs=len(refs),bad_openapi_refs=bad_refs,openapi_operations=len(operations),openapi_statuses=dict(collections.Counter(o.get('x-implementation-status','unspecified') for o in operations)))


def main():
    self_test()
    paths = sorted(p for p in DOCS.rglob('*') if p.is_file() and HERE not in p.parents and p != OWN_LOG)
    # NUL-delimited output avoids Git's quoted non-ASCII filename escapes.
    tracked = set(git('ls-files', '-z', '--', 'docs').split('\0'))
    rows, checks = [], []
    incoming = collections.Counter()
    total_bytes = 0
    for p in paths:
        data = p.read_bytes()
        rel = p.relative_to(ROOT).as_posix()
        kind, phase, action, dest = classify(rel)
        text = data.decode('utf-8-sig') if p.suffix in ['.md','.json'] else ''
        row = dict(path=rel,kind=kind,phase=phase,bytes=len(data),lines=len(text.splitlines()) if text else '',tracked=rel in tracked,sha256=hashlib.sha256(data).hexdigest(),proposed_action=action,proposed_folder=dest)
        total_bytes += len(data)
        if p.suffix == '.png':
            assert data[:8] == b'\x89PNG\r\n\x1a\n', rel
            row['width'], row['height'] = struct.unpack('>II', data[16:24])
        rows.append(row)
        if p.suffix == '.json': json.loads(text)
        if p.suffix != '.md': continue
        for no, dest in links(text):
            item = dict(source=rel,line=no,target=dest)
            if dest.startswith('UNRESOLVED_REFERENCE:'):
                item['result'] = 'unresolved_reference'
            elif re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:', dest) and not re.match(r'^[A-Za-z]:[/\\]', dest):
                item['result'] = 'external_not_fetched'
            else:
                parts = urlsplit(dest)
                target = (ROOT / unquote(parts.path).lstrip('/')) if parts.path.startswith('/') else p.parent / unquote(parts.path)
                target = target.resolve() if parts.path else p.resolve()
                if not target.exists(): item['result'] = 'missing_file'
                elif parts.fragment and target.suffix == '.md':
                    item['result'] = 'ok' if unquote(parts.fragment) in anchors(target.read_text(encoding='utf-8-sig')) else 'anchor_candidate'
                else: item['result'] = 'ok'
                if target.exists() and target.is_relative_to(ROOT): incoming[target.relative_to(ROOT).as_posix()] += 1
            checks.append(item)
    for row in rows: row['incoming_markdown_links_within_docs'] = incoming[row['path']]
    columns = ['path','kind','phase','bytes','lines','tracked','sha256','width','height','incoming_markdown_links_within_docs','proposed_action','proposed_folder']
    with (HERE/'inventory.csv').open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
    manifests = []
    external_assets = []
    for manifest_path in sorted((DOCS/'design').glob('*/manifest.json')):
        manifest = json.loads(manifest_path.read_text(encoding='utf-8-sig'))
        for entry in manifest['files']:
            p = manifest_path.parent/entry['file']
            data = p.read_bytes()
            w,h = struct.unpack('>II', data[16:24])
            size_matches = entry['bytes'] == len(data) if 'bytes' in entry else None
            manifests.append(dict(file=p.relative_to(ROOT).as_posix(),ok=size_matches is not False and entry['width']==w and entry['height']==h and entry['sha256']==hashlib.sha256(data).hexdigest(),size_recorded='bytes' in entry,size_matches=size_matches))
        for entry in manifest.get('references', []):
            p = Path(entry['file'])
            external_assets.append(dict(manifest=manifest_path.relative_to(ROOT).as_posix(),path=entry['file'],exists=p.is_file(),inside_repository=p.is_relative_to(ROOT)))
    hashes = collections.defaultdict(list)
    for row in rows: hashes[row['sha256']].append(row['path'])
    summary = dict(scanned_at_utc=datetime.now(timezone.utc).isoformat(),branch=git('branch','--show-current').strip(),head=git('rev-parse','HEAD').strip(),files=len(paths),bytes=total_bytes,extensions=dict(collections.Counter(p.suffix for p in paths)),tracked=sum(r['tracked'] for r in rows),untracked=sum(not r['tracked'] for r in rows),by_folder=dict(collections.Counter(str(p.relative_to(DOCS).parent).replace('\\','/') for p in paths)),links=dict(collections.Counter(c['result'] for c in checks)),manifest=manifests,external_assets=external_assets,identical_files=[g for g in hashes.values() if len(g)>1],zero_incoming_markdown=[r['path'] for r in rows if r['path'].endswith('.md') and not r['incoming_markdown_links_within_docs']],self_test='PASS',limitations=['Link subset, not full CommonMark; bare/code paths excluded.','Anchor candidates require manual review; external URLs not fetched.','Incoming links counted only from baseline docs Markdown.','No functional, security, remote-ref or human visual acceptance tests.','Baseline excludes this audit folder and its own work log.'])
    summary['structural'] = structural_checks(paths)
    (HERE/'checks.json').write_text(json.dumps(dict(summary=summary,links=checks),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print('LINK CANDIDATES')
    for c in checks:
        if c['result'] not in ['ok','external_not_fetched']: print(json.dumps(c,ensure_ascii=False))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
