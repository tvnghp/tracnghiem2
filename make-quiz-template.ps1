$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot 'quiz-template.xlsx'
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Add()
$ws = $wb.Worksheets.Item(1)
$headers = @('topicId','topicName','question','optionA','optionB','optionC','optionD','answer','explain')
for ($i=0; $i -lt $headers.Count; $i++) {
  $ws.Cells.Item(1,$i+1).Value2 = $headers[$i]
}
$data = @(
  @('','Sample Topic','Question 1: Choose the correct answer?','Answer A','Answer B','Answer C','Answer D','A','Explanation for question 1'),
  @('','Sample Topic','Question 2: Select all correct answers','Answer A','Answer B','Answer C','Answer D','A,C','Explanation: This question has two correct answers A and C'),
  @('','Sample Topic','Question 3: Single answer','Option 1','Option 2','Option 3','Option 4','D','Explanation for question 3')
)
for ($r=0; $r -lt $data.Count; $r++) {
  for ($c=0; $c -lt $data[$r].Count; $c++) {
    $ws.Cells.Item($r+2, $c+1).Value2 = $data[$r][$c]
  }
}
$ws.Columns.AutoFit() | Out-Null
# 51 = xlOpenXMLWorkbook (.xlsx)
$wb.SaveAs($path, 51)
$wb.Close($true)
$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ws) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
Write-Host "Created: $path"
