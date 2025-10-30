import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'

/**
 * Exporta contenido de texto a PDF con formato
 */
export async function exportToPDF(content: string, filename: string = 'documento-legal.pdf') {
  const doc = new jsPDF()
  
  // Configurar márgenes
  const marginLeft = 15
  const marginTop = 20
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = pageWidth - 2 * marginLeft
  
  // Dividir el contenido en líneas
  const lines = doc.splitTextToSize(content, maxWidth)
  
  let y = marginTop
  
  // Agregar cada línea
  lines.forEach((line: string) => {
    if (y > pageHeight - 20) {
      doc.addPage()
      y = marginTop
    }
    doc.text(line, marginLeft, y)
    y += 7
  })
  
  // Guardar el PDF
  doc.save(filename)
}

/**
 * Exporta contenido de texto a DOCX
 */
export async function exportToDOCX(content: string, filename: string = 'documento-legal.docx') {
  // Dividir el contenido en párrafos
  const paragraphs = content.split('\n\n').map(para => {
    // Detectar encabezados
    if (para.startsWith('# ')) {
      return new Paragraph({
        text: para.replace('# ', ''),
        heading: HeadingLevel.HEADING_1
      })
    }
    if (para.startsWith('## ')) {
      return new Paragraph({
        text: para.replace('## ', ''),
        heading: HeadingLevel.HEADING_2
      })
    }
    if (para.startsWith('### ')) {
      return new Paragraph({
        text: para.replace('### ', ''),
        heading: HeadingLevel.HEADING_3
      })
    }
    
    // Texto normal con negritas básicas
    const textRuns: TextRun[] = []
    let currentText = para
    
    // Procesar negritas **texto**
    while (currentText.includes('**')) {
      const start = currentText.indexOf('**')
      const end = currentText.indexOf('**', start + 2)
      
      if (end === -1) break
      
      const before = currentText.substring(0, start)
      const bold = currentText.substring(start + 2, end)
      const after = currentText.substring(end + 2)
      
      if (before) textRuns.push(new TextRun(before))
      textRuns.push(new TextRun({ text: bold, bold: true }))
      
      currentText = after
    }
    
    if (currentText) textRuns.push(new TextRun(currentText))
    
    return new Paragraph({
      children: textRuns.length > 0 ? textRuns : [new TextRun(para)]
    })
  })
  
  // Crear el documento
  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  })
  
  // Generar y descargar
  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}

