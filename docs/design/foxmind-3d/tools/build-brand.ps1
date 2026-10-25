Add-Type -AssemblyName System.Drawing
$designRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$brandOutput = Join-Path $designRoot 'assets/brand'
[System.IO.Directory]::CreateDirectory($brandOutput) | Out-Null
$invariant = [System.Globalization.CultureInfo]::InvariantCulture
function NumberText([double]$value) { $value.ToString('0.##', $invariant) }
function OutlinedWord([string]$value, [float]$size) {
  $outline = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $family = [System.Drawing.FontFamily]::new('Trebuchet MS')
  $outline.AddString($value, $family, [int][System.Drawing.FontStyle]::Bold, $size, [System.Drawing.PointF]::new(0,0), [System.Drawing.StringFormat]::GenericTypographic)
  $bounds = $outline.GetBounds()
  $matrix = [System.Drawing.Drawing2D.Matrix]::new()
  $matrix.Translate(-$bounds.X, -$bounds.Y)
  $outline.Transform($matrix)
  $points = $outline.PathPoints
  $types = $outline.PathTypes
  $segments = [System.Collections.Generic.List[string]]::new()
  $i = 0
  while ($i -lt $points.Length) {
    $kind = $types[$i] -band 7
    if ($kind -eq 0) { $segments.Add('M' + (NumberText $points[$i].X) + ' ' + (NumberText $points[$i].Y)) }
    elseif ($kind -eq 1) { $segments.Add('L' + (NumberText $points[$i].X) + ' ' + (NumberText $points[$i].Y)) }
    elseif ($kind -eq 3) {
      $segments.Add('C' + (NumberText $points[$i].X) + ' ' + (NumberText $points[$i].Y) + ' ' + (NumberText $points[$i+1].X) + ' ' + (NumberText $points[$i+1].Y) + ' ' + (NumberText $points[$i+2].X) + ' ' + (NumberText $points[$i+2].Y))
      $i += 2
    }
    if (($types[$i] -band 128) -ne 0) { $segments.Add('Z') }
    $i++
  }
  $result = @{ D = ($segments -join ' '); Width = $bounds.Width; Height = $bounds.Height }
  $matrix.Dispose(); $outline.Dispose(); $family.Dispose()
  return $result
}
$fox = @'
<g stroke="#4B2417" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
<path fill="#FF782D" d="M53 154C17 134 9 68 28 20Q31 10 41 17C75 38 104 69 113 98L143 98C153 69 181 38 215 17Q225 10 228 20C247 68 239 134 203 154Z"/>
<path fill="#FFE6B7" d="M52 128C29 109 29 64 38 35C61 53 83 79 91 104Z"/>
<path fill="#FFE6B7" d="M204 128C227 109 227 64 218 35C195 53 173 79 165 104Z"/>
<path fill="#FF782D" d="M35 154C46 118 68 90 103 85L94 68Q111 67 125 83L124 59Q143 61 156 87C190 92 211 119 221 154L246 168C233 211 191 241 128 243C65 241 23 211 10 168Z"/>
<path fill="#FFF1CF" stroke="none" d="M20 172L44 157L35 178Q64 160 89 174Q108 185 128 183Q148 185 167 174Q192 160 221 178L212 157L236 172C221 209 183 232 128 234C73 232 35 209 20 172Z"/>
<path fill="#FFF7E4" d="M72 160C58 149 61 115 81 108C102 101 115 120 111 144C108 163 89 171 72 160Z"/>
<path fill="#FFF7E4" d="M184 160C198 149 195 115 175 108C154 101 141 120 145 144C148 163 167 171 184 160Z"/>
<ellipse fill="#4B2417" stroke="none" cx="92" cy="140" rx="13" ry="20"/>
<ellipse fill="#4B2417" stroke="none" cx="164" cy="140" rx="13" ry="20"/>
<ellipse fill="#FFFFFF" stroke="none" cx="96" cy="131" rx="5" ry="7"/>
<ellipse fill="#FFFFFF" stroke="none" cx="160" cy="131" rx="5" ry="7"/>
<path fill="none" d="M64 99Q80 85 96 94M160 94Q176 85 192 99"/>
<path fill="#4B2417" d="M111 170Q128 162 145 170Q148 181 128 189Q108 181 111 170Z"/>
<path fill="#4B2417" d="M85 190Q103 209 128 198Q153 209 171 190Q157 226 128 228Q99 226 85 190Z"/>
<path fill="#EF603A" stroke="none" d="M108 218Q129 204 149 218Q129 233 108 218Z"/>
<path fill="none" d="M128 188V199"/>
</g>
'@
$mono = @'
<path fill="currentColor" fill-rule="evenodd" d="M28 20Q31 10 41 17C75 38 104 69 111 86L103 68Q117 68 125 82L124 59Q143 61 156 87C166 66 191 33 215 17Q225 10 228 20C245 67 241 124 220 154L246 168C233 211 191 241 128 243C65 241 23 211 10 168L36 154C14 123 11 68 28 20ZM39 40C33 65 33 93 47 114L78 92Q61 62 39 40ZM217 40Q195 62 178 92L209 114C223 93 223 65 217 40ZM65 135C62 162 90 176 105 153C119 131 105 107 89 108C74 107 67 119 65 135ZM191 135C189 119 182 107 167 108C151 107 137 131 151 153C166 176 194 162 191 135ZM83 188Q96 219 128 221Q160 219 173 188Q148 207 128 195Q108 207 83 188Z"/>
'@
function SaveSvg([string]$name, [string]$viewBox, [string]$contents) {
  $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + $viewBox + '" role="img" aria-label="FoxMind"><title>FoxMind</title>' + $contents + '</svg>'
  [System.IO.File]::WriteAllText((Join-Path $brandOutput $name), $svg, [System.Text.UTF8Encoding]::new($false))
}
$wordFox = OutlinedWord 'Fox' 118
$wordMind = OutlinedWord 'Mind' 118
$mindX = 205 + $wordFox.Width + 5
$totalWidth = [Math]::Ceiling($mindX + $wordMind.Width + 8)
$words = '<path fill="#FF782D" transform="translate(205 52)" d="' + $wordFox.D + '"/><path fill="#4B2417" transform="translate(' + (NumberText $mindX) + ' 52)" d="' + $wordMind.D + '"/>'
$mark = '<g transform="translate(0 0) scale(.72)">' + $fox + '</g>'
SaveSvg 'mark.svg' '0 0 256 256' $fox
SaveSvg 'favicon.svg' '0 0 256 256' $fox
SaveSvg 'mark-mono.svg' '0 0 256 256' ('<g color="#202522">' + $mono + '</g>')
SaveSvg 'logo-horizontal.svg' ('0 0 ' + $totalWidth + ' 185') ($mark + $words)
SaveSvg 'logo-horizontal-inverse.svg' ('0 0 ' + $totalWidth + ' 185') ($mark + $words.Replace('#4B2417', '#FFF1CF'))
SaveSvg 'logo-mono.svg' ('0 0 ' + $totalWidth + ' 185') ('<g color="#202522" transform="scale(.72)">' + $mono + '</g>' + $words.Replace('#FF782D', '#202522').Replace('#4B2417', '#202522'))
$wordOnly = '<g transform="translate(-205 -40)">' + $words + '</g>'
SaveSvg 'wordmark.svg' ('0 0 ' + ($totalWidth - 205) + ' 130') $wordOnly
$stackScale = 370 / ($totalWidth - 205)
SaveSvg 'logo-stacked.svg' '0 0 400 360' ('<g transform="translate(88 0) scale(.88)">' + $fox + '</g><g transform="translate(15 238) scale(' + (NumberText $stackScale) + ')">' + $wordOnly + '</g>')
Write-Output ('Generated 8 true-vector SVG files in ' + $brandOutput)
