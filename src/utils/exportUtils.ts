// PDF generation with jsPDF library

import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

export interface ExportColumn {
  key: string
  label: string
  format?: (value: any, row?: any) => string
  renderAsImage?: boolean // For PDF exports, render cell as image if value is a valid image URL
}

export interface ChartImage {
  title: string
  imageData: string // base64 image data
  width?: number
  height?: number
}

export interface ExportOptions {
  filename?: string
  title?: string
  subtitle?: string
  headerLines?: string[]
  includeTimestamp?: boolean
  logoUrl?: string
  leftLogoUrl?: string
  rightLogoUrl?: string
  orientation?: 'portrait' | 'landscape'
  chartImages?: ChartImage[] // Array of chart images to include in PDF
  hideTotalRecords?: boolean // Hide "Total Records:" line in exports
}

export class ExportUtils {
  /**
   * Export data to CSV format
   */
  static exportToCSV<T>(data: T[], columns: ExportColumn[], options: ExportOptions = {}): void {
    const { filename = "export", includeTimestamp = true } = options

    // Create CSV header
    const headers = columns.map((col) => col.label)

    // Create CSV rows
    const rows = data.map((item) =>
      columns.map((col) => {
        const value = (item as any)[col.key]
        return col.format ? col.format(value, item) : String(value || "")
      }),
    )

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n")

    // Create and download file
    this.downloadFile(csvContent, `${filename}${includeTimestamp ? `_${this.getTimestamp()}` : ""}.csv`, "text/csv")
  }

  /**
   * Export data to PDF format (using jsPDF library)
   */
  static async exportToPDF<T>(data: T[], columns: ExportColumn[], options: ExportOptions = {}): Promise<void> {
    const {
      filename = "export",
      title = "Data Export",
      subtitle,
      headerLines = [
        "Republic of the Philippines",
        "Province of Batangas",
        "Municipality of Rosario",
        "MUNICIPAL DISASTER RISK REDUCTION AND MANAGEMENT OFFICE"
      ],
      includeTimestamp = true,
      logoUrl = "/images/partners/MDRRMO.png",
      leftLogoUrl = "/images/partners/lgu-pt.png",
      rightLogoUrl = "/images/partners/MDRRMO.png",
      orientation = 'portrait',
      chartImages,
      hideTotalRecords = false,
    } = options

    // Use specific logos if provided, otherwise fall back to logoUrl for both sides
    const leftLogo = leftLogoUrl
    const rightLogo = rightLogoUrl

    // Create PDF with specified orientation
    const orientationParam = orientation === 'landscape' ? 'l' : 'p'
    const doc = new jsPDF(orientationParam)

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20 // Increased margin for better spacing
    const headerHeight = 45 // Increased header height for better layout
    let currentY = headerHeight
    let pageNumber = 1 // Initialize page number early

    const drawPageHeader = async () => {
      // ===== ENHANCED HEADER WITH DUAL LOGOS =====
      doc.setFillColor(248, 250, 252)
      doc.rect(0, 0, pageWidth, headerHeight + 5, "F")

      const logoWidth = 25
      const logoHeight = 25
      const logoY = 10

      // Helper function to load and add image
      const addLogoImage = async (imageUrl: string, xPos: number) => {
        try {
          if (imageUrl.startsWith("data:image")) {
            doc.addImage(imageUrl, "PNG", xPos, logoY, logoWidth, logoHeight)
          } else {
            const img = new Image()
            img.crossOrigin = "Anonymous"

            const loadImagePromise = new Promise<void>((resolve, reject) => {
              img.onload = () => {
                try {
                  const canvas = document.createElement("canvas")
                  const ctx = canvas.getContext("2d")
                  if (!ctx) {
                    reject(new Error("Canvas context not available"))
                    return
                  }

                  const scaleFactor = 6 // Higher resolution for ultra quality
                  const aspectRatio = img.width / img.height

                  let drawWidth = logoWidth
                  let drawHeight = logoHeight

                  if (img.width > logoWidth || img.height > logoHeight) {
                    if (aspectRatio > logoWidth / logoHeight) {
                      drawHeight = logoWidth / aspectRatio
                    } else {
                      drawWidth = logoHeight * aspectRatio
                    }
                  }

                  canvas.width = Math.max(img.width, drawWidth * scaleFactor)
                  canvas.height = Math.max(img.height, drawHeight * scaleFactor)

                  ctx.imageSmoothingEnabled = true
                  ctx.imageSmoothingQuality = "high"
                  ctx.fillStyle = "#FFFFFF"
                  ctx.fillRect(0, 0, canvas.width, canvas.height)

                  const scaleX = canvas.width / img.width
                  const scaleY = canvas.height / img.height
                  const scale = Math.min(scaleX, scaleY)

                  const x = (canvas.width - img.width * scale) / 2
                  const y = (canvas.height - img.height * scale) / 2

                  ctx.drawImage(img, x, y, img.width * scale, img.height * scale)

                  const base64 = canvas.toDataURL("image/png", 1.0)
                  const yOffset = logoY + (logoHeight - drawHeight) / 2
                  doc.addImage(base64, "PNG", xPos, yOffset, drawWidth, drawHeight)
                  resolve()
                } catch (error) {
                  reject(error)
                }
              }

              img.onerror = () => {
                reject(new Error(`Failed to load image: ${imageUrl}`))
              }

              img.src = imageUrl
            })

            await loadImagePromise
          }
        } catch (error) {
          console.warn("Failed to add logo to PDF:", error)
        }
      }

      // Add left logo
      if (leftLogo) {
        await addLogoImage(leftLogo, margin)
      }

      // Add right logo
      if (rightLogo) {
        await addLogoImage(rightLogo, pageWidth - margin - logoWidth)
      }

      // Center text/title section
      doc.setTextColor(17, 24, 39)
      let textY = 12

      if (headerLines && headerLines.length > 0) {
        // Multi-line header (official document style)
        const maxTextWidth = pageWidth - (2 * margin) - (2 * logoWidth) - 10 // Leave space for logos
        
        headerLines.forEach((line, index) => {
          if (index === 0) {
            // First line - usually "Republic of the Philippines"
            doc.setFontSize(11)
            doc.setFont("helvetica", "bold")
          } else if (index === headerLines.length - 1) {
            // Last line - usually the main title/office name (MDRRMO)
            doc.setFontSize(9)
            doc.setFont("helvetica", "bold")
          } else {
            // Middle lines - location/department info
            doc.setFontSize(10)
            doc.setFont("helvetica", "normal")
          }
          
          // Split long text if needed
          const splitText = doc.splitTextToSize(line, maxTextWidth)
          if (Array.isArray(splitText) && splitText.length > 1) {
            splitText.forEach((textLine, lineIndex) => {
              doc.text(textLine, pageWidth / 2, textY, { align: "center" })
              if (lineIndex < splitText.length - 1) textY += 4
            })
            textY += 4.5
          } else {
            doc.text(line, pageWidth / 2, textY, { align: "center", maxWidth: maxTextWidth })
            textY += 4.5
          }
        })
      } else {
        // Simple title format
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text(title, pageWidth / 2, textY, { align: "center" })
        textY += 5

        if (subtitle) {
          doc.setFontSize(10)
          doc.setFont("helvetica", "normal")
          doc.setTextColor(75, 85, 99)
          doc.text(subtitle, pageWidth / 2, textY, { align: "center" })
          textY += 5
        }
      }

      // Timestamp below header text
      if (includeTimestamp) {
        textY += 2
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(107, 114, 128)
        const now = new Date()
        const monthName = now.toLocaleString("default", { month: "long" })
        const day = now.getDate()
        const year = now.getFullYear()
        let hours = now.getHours()
        const minutes = now.getMinutes().toString().padStart(2, "0")
        const seconds = now.getSeconds().toString().padStart(2, "0")
        const ampm = hours >= 12 ? "PM" : "AM"
        hours = hours % 12
        hours = hours ? hours : 12
        const hourStr = hours.toString().padStart(2, "0")
        const timestampText = `Generated: ${monthName} ${day}, ${year} at ${hourStr}:${minutes}:${seconds} ${ampm}`
        doc.text(timestampText, pageWidth / 2, textY, { align: "center" })
      }

      // Bottom border line
      doc.setDrawColor(229, 231, 235)
      doc.setLineWidth(0.5)
      doc.line(margin, headerHeight, pageWidth - margin, headerHeight)
    }

    // Footer drawing function (declared before use)
    const drawPageFooter = async (currentPageNumber: number, totalPages?: number) => {
      const footerY = pageHeight - 15
      
      // Add Soteros logo in footer (bottom center)
      try {
        const footerLogoWidth = 25
        const footerLogoHeight = 18
        const footerLogoY = pageHeight - 20
        const soterosLogo = "/images/soteros_logo.png"
        
        if (soterosLogo) {
          const img = new Image()
          img.crossOrigin = "Anonymous"
          
          const loadImagePromise = new Promise<void>((resolve, reject) => {
            img.onload = () => {
              try {
                const canvas = document.createElement("canvas")
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                  reject(new Error("Canvas context not available"))
                  return
                }

                const scaleFactor = 6
                const aspectRatio = img.width / img.height

                let drawWidth = footerLogoWidth
                let drawHeight = footerLogoHeight

                if (img.width > footerLogoWidth || img.height > footerLogoHeight) {
                  if (aspectRatio > footerLogoWidth / footerLogoHeight) {
                    drawHeight = footerLogoWidth / aspectRatio
                  } else {
                    drawWidth = footerLogoHeight * aspectRatio
                  }
                }

                canvas.width = Math.max(img.width, drawWidth * scaleFactor)
                canvas.height = Math.max(img.height, drawHeight * scaleFactor)

                ctx.imageSmoothingEnabled = true
                ctx.imageSmoothingQuality = "high"
                ctx.fillStyle = "#FFFFFF"
                ctx.fillRect(0, 0, canvas.width, canvas.height)

                const scaleX = canvas.width / img.width
                const scaleY = canvas.height / img.height
                const scale = Math.min(scaleX, scaleY)

                const x = (canvas.width - img.width * scale) / 2
                const y = (canvas.height - img.height * scale) / 2

                ctx.drawImage(img, x, y, img.width * scale, img.height * scale)

                const base64 = canvas.toDataURL("image/png", 1.0)
                const yOffset = footerLogoY + (footerLogoHeight - drawHeight) / 2
                const centerX = (pageWidth - drawWidth) / 2
                doc.addImage(base64, "PNG", centerX, yOffset, drawWidth, drawHeight)
                resolve()
              } catch (error) {
                reject(error)
              }
            }

            img.onerror = () => {
              reject(new Error(`Failed to load footer logo`))
            }

            img.src = soterosLogo
          })

          await loadImagePromise
        }
      } catch (error) {
        console.warn("Failed to add footer logo:", error)
      }

      // Footer text (below logo)
      doc.setFontSize(7)
      doc.setTextColor(107, 114, 128)
      const footerText = totalPages 
        ? `Page ${currentPageNumber} of ${totalPages}`
        : `Page ${currentPageNumber}`
      doc.text(footerText, pageWidth / 2, pageHeight - 5, { align: "center" })
    }

    await drawPageHeader()

    // Add title below header
    if (title && title !== "Data Export") {
      currentY += 8
      doc.setFontSize(13)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(17, 24, 39)
      doc.text(title, pageWidth / 2, currentY, { align: "center" })
      currentY += 3
    }

    // Add chart images if provided
    if (chartImages && chartImages.length > 0) {
      const chartFooterSpace = 20 // Space needed for footer
      const chartAvailableHeight = pageHeight - margin - chartFooterSpace
      
      currentY += 10
      const spacingBetweenCharts = 15 // Spacing between charts
      
      for (let i = 0; i < chartImages.length; i++) {
        const chartImage = chartImages[i]
        
        // Calculate chart dimensions to fit within page width
        const maxChartWidth = pageWidth - 2 * margin
        const chartWidth = chartImage.width ? (chartImage.width * 0.264583) : maxChartWidth
        const finalChartWidth = Math.min(chartWidth, maxChartWidth)
        const aspectRatio = chartImage.height && chartImage.width ? chartImage.height / chartImage.width : 0.75
        const finalChartHeight = finalChartWidth * aspectRatio
        
        // Calculate actual title height (may be multiple lines)
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        const titleText = chartImage.title
        const maxTitleWidth = maxChartWidth - 10
        const titleWidth = doc.getTextWidth(titleText)
        let titleHeight = 5
        if (titleWidth > maxTitleWidth) {
          const titleLines = doc.splitTextToSize(titleText, maxTitleWidth)
          titleHeight = (Array.isArray(titleLines) ? titleLines.length : 1) * 5
        }
        
        // Calculate total space needed for this chart (title + chart + spacing)
        const spacingBeforeChart = i > 0 ? spacingBetweenCharts : 0
        const totalChartHeight = spacingBeforeChart + titleHeight + finalChartHeight
        
        // Check if we need a new page before adding this chart
        if (currentY + totalChartHeight > chartAvailableHeight) {
          // Not enough space on current page - move to next page
          await drawPageFooter(pageNumber)
          doc.addPage(orientationParam as 'p' | 'l')
          pageNumber++
          await drawPageHeader()
          currentY = headerHeight + 15
        } else if (i > 0) {
          // Add spacing between charts (after confirming we have space)
          currentY += spacingBetweenCharts
        }

        // Add chart title
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(17, 24, 39)
        if (titleWidth > maxChartWidth - 10) {
          // Wrap title if too long
          const titleLines = doc.splitTextToSize(titleText, maxChartWidth - 10)
          if (Array.isArray(titleLines)) {
            titleLines.forEach((line, idx) => {
              doc.text(line, pageWidth / 2, currentY + idx * 5, { align: "center" })
            })
            currentY += titleLines.length * 5
          } else {
            doc.text(titleText, pageWidth / 2, currentY, { align: "center", maxWidth: maxChartWidth - 10 })
            currentY += 5
          }
        } else {
          doc.text(titleText, pageWidth / 2, currentY, { align: "center" })
          currentY += 5
        }

        // Add chart image - use currentY directly (positioned right after title)
        try {
          const imgX = (pageWidth - finalChartWidth) / 2
          doc.addImage(chartImage.imageData, "PNG", imgX, currentY, finalChartWidth, finalChartHeight)
          // Update currentY to position after this chart with spacing
          currentY += finalChartHeight + 5
          
          // Safety check: ensure currentY doesn't exceed available space
          if (currentY > chartAvailableHeight) {
            currentY = chartAvailableHeight
          }
        } catch (error) {
          console.error('Error adding chart image to PDF:', error)
          currentY += 10
        }
      }
    }

    // ===== SINGLE RECORD FORMAT (NOT TABLE) =====
    if (data.length === 1) {
      // Display single record as a simple list format (not table)
      currentY += 15
      const singleRecord = data[0]
      const labelWidth = 80 // Width for labels
      const valueWidth = pageWidth - margin - labelWidth - margin // Remaining width for values
      
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      
      columns.forEach((col, index) => {
        const label = col.label
        const value = (singleRecord as any)[col.key]
        const formattedValue = col.format ? col.format(value, singleRecord) : String(value || "")
        
        // Check if we need a new page
        const footerSpace = 20
        const availablePageHeight = pageHeight - margin - footerSpace
        if (currentY + 10 > availablePageHeight) {
          await drawPageFooter(pageNumber)
          doc.addPage(orientationParam as 'p' | 'l')
          pageNumber++
          await drawPageHeader()
          currentY = headerHeight + 15
        }
        
        // Label (bold)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(55, 65, 81)
        const labelLines = doc.splitTextToSize(label, labelWidth - 10)
        if (Array.isArray(labelLines)) {
          labelLines.forEach((line, lineIndex) => {
            doc.text(line, margin, currentY + lineIndex * 5)
          })
        } else {
          doc.text(label, margin, currentY)
        }
        
        // Value (normal)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(17, 24, 39)
        const valueLines = doc.splitTextToSize(formattedValue, valueWidth - 10)
        const labelHeight = Array.isArray(labelLines) ? labelLines.length * 5 : 5
        const valueHeight = Array.isArray(valueLines) ? valueLines.length * 5 : 5
        const maxHeight = Math.max(labelHeight, valueHeight)
        
        if (Array.isArray(valueLines)) {
          valueLines.forEach((line, lineIndex) => {
            doc.text(line, margin + labelWidth, currentY + lineIndex * 5)
          })
        } else {
          doc.text(formattedValue, margin + labelWidth, currentY)
        }
        
        // Add separator line
        doc.setDrawColor(229, 231, 235)
        doc.setLineWidth(0.2)
        doc.line(margin, currentY + maxHeight + 2, pageWidth - margin, currentY + maxHeight + 2)
        
        currentY += maxHeight + 8
      })
      
      // Skip total records section for single record
    } else {
      // ===== ENHANCED TABLE LOGIC (FOR MULTIPLE RECORDS) =====
    const headers = columns.map((col) => col.label)
    const rows = data.map((item) =>
      columns.map((col) => {
        const value = (item as any)[col.key]
        return col.format ? col.format(value, item) : String(value || "")
      }),
    )

    const availableWidth = pageWidth - 2 * margin
    const minColWidth = 15 // Minimum width for readability
    const maxColWidth = orientation === 'landscape' ? 100 : 45 // Max width per column

    // Calculate column widths with better distribution
    const colWidths: number[] = []
    headers.forEach((header, index) => {
      const headerWidth = doc.getTextWidth(header) + 10 // Padding for header
      const sampleRows = rows.length > 30 ? rows.slice(0, 30) : rows
      const maxDataWidth = Math.max(
        ...sampleRows.map((row) => {
          const cellText = String(row[index] || "")
          if (!cellText || cellText === "undefined" || cellText === "null") return 0
          // Use available width minus padding for text wrapping calculation
          const textWidth = Math.min(maxColWidth - 10, availableWidth / headers.length - 10)
          const lines = doc.splitTextToSize(cellText, textWidth)
          if (Array.isArray(lines)) {
            return Math.max(...lines.map((line: string) => doc.getTextWidth(line))) + 10
          } else {
            return doc.getTextWidth(lines) + 10
          }
        }),
      )
      const optimalWidth = Math.max(headerWidth, maxDataWidth, minColWidth)
      colWidths.push(Math.min(optimalWidth, maxColWidth))
    })

    // Ensure total width never exceeds available width
    let totalWidth = colWidths.reduce((sum, width) => sum + width, 0)
    if (totalWidth > availableWidth) {
      const scaleFactor = availableWidth / totalWidth
      colWidths.forEach((width, index) => {
        colWidths[index] = Math.max(width * scaleFactor, minColWidth)
      })
      // Recalculate total after scaling
      totalWidth = colWidths.reduce((sum, width) => sum + width, 0)
    }
    
    // Final safety check: ensure total width is exactly within bounds
    if (totalWidth > availableWidth) {
      const finalScaleFactor = (availableWidth - 1) / totalWidth // -1 for safety margin
      colWidths.forEach((width, index) => {
        colWidths[index] = Math.max(width * finalScaleFactor, minColWidth)
      })
    }

    const drawTableHeader = (yPos: number, pageNumber: number) => {
      const headerHeight = 10 // Header height
      const tableWidth = Math.min(colWidths.reduce((a, b) => a + b, 0), availableWidth)
      
      // Gradient-like header background
      doc.setFillColor(59, 130, 246) // Professional blue
      doc.rect(
        margin,
        yPos - 5,
        tableWidth,
        headerHeight,
        "F",
      )

      // Header border
      doc.setLineWidth(0.2)
      doc.setDrawColor(37, 99, 235)
      doc.rect(
        margin,
        yPos - 5,
        tableWidth,
        headerHeight,
      )

      // Column separators
      let cellX = margin
      for (let i = 0; i < colWidths.length; i++) {
        if (i > 0) {
          doc.setDrawColor(255, 255, 255)
          doc.line(cellX, yPos - 5, cellX, yPos - 5 + headerHeight)
        }
        cellX += colWidths[i]
      }

      // Header text
      doc.setTextColor(255, 255, 255) // White text on blue background
      doc.setFont("helvetica", pageNumber === 1 ? "bold" : "normal")
      doc.setFontSize(8)
      let xPos = margin
      headers.forEach((header, index) => {
        const colWidth = colWidths[index]
        const headerText = String(header)
        const maxTextWidth = Math.max(colWidth - 6, 10) // Ensure minimum width
        const lines = doc.splitTextToSize(headerText, maxTextWidth)
        if (Array.isArray(lines)) {
          lines.forEach((line, lineIndex) => {
            const textY = yPos + lineIndex * 4
            if (textY <= yPos - 5 + headerHeight - 2) { // Ensure text doesn't overflow
              doc.text(line, xPos + 3, textY, { maxWidth: maxTextWidth })
            }
          })
        } else {
          doc.text(headerText || "", xPos + 3, yPos, { maxWidth: maxTextWidth })
        }
        xPos += colWidth
      })
      return yPos + 8
    }

    currentY += 15 // More space before table
    currentY = drawTableHeader(currentY, pageNumber)

    // Calculate available space on current page
    const footerSpace = 20 // Space needed for footer
    const availablePageHeight = pageHeight - margin - footerSpace

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    
    // Pre-calculate row heights for better pagination decisions
    const rowHeights: number[] = []
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex]
      let maxCellHeight = 8 // Minimum height
      
      row.forEach((_, index) => {
        const colWidth = colWidths[index]
        const cellText = String(row[index] || "")
        // Ensure text width calculation uses safe width
        const safeTextWidth = Math.max(colWidth - 8, 10)
        const lines = doc.splitTextToSize(cellText, safeTextWidth)
        const cellHeight = (Array.isArray(lines) ? lines.length : 1) * 4 + 4
        maxCellHeight = Math.max(maxCellHeight, cellHeight)
      })
      
      rowHeights.push(maxCellHeight)
    }

    const tableWidth = Math.min(colWidths.reduce((a, b) => a + b, 0), availableWidth)
    
    // Smart pagination: calculate how many rows can fit on each page
    const getRowsForPage = (startIndex: number, startY: number): number => {
      let rowsThatFit = 0
      let currentY = startY
      const minSafetyMargin = 3 // Minimum margin to prevent overflow
      
      for (let i = startIndex; i < rows.length; i++) {
        const rowHeight = rowHeights[i]
        // Check if this row fits with minimum safety margin
        if (currentY + rowHeight + minSafetyMargin <= availablePageHeight) {
          rowsThatFit++
          currentY += rowHeight
        } else {
          // If there's still significant space left (more than half a row), try to fit it
          const remainingSpace = availablePageHeight - currentY
          if (remainingSpace > rowHeight * 0.5 && i === startIndex) {
            // If it's the first row and we have more than half space, try to fit it
            // This prevents unnecessary page breaks for rows that are just slightly too tall
            rowsThatFit++
          }
          break
        }
      }
      return rowsThatFit
    }
    
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex]
      const maxCellHeight = rowHeights[rowIndex]
      const cellLines: string[][] = []

      // Prepare cell lines with proper text wrapping
      row.forEach((_, index) => {
        const colWidth = colWidths[index]
        const cellText = String(row[index] || "")
        const safeTextWidth = Math.max(colWidth - 8, 10)
        const lines = doc.splitTextToSize(cellText, safeTextWidth)
        cellLines.push(Array.isArray(lines) ? lines : [lines])
      })

      // Smart page break: check if row fits, but be more lenient to maximize space usage
      const remainingSpace = availablePageHeight - currentY
      const minSafetyMargin = 3 // Reduced margin to maximize space usage
      
      // Only break if row definitely won't fit (with some tolerance for very tall rows)
      const willCurrentRowFit = currentY + maxCellHeight + minSafetyMargin <= availablePageHeight
      
      // Additional check: if remaining space is very small (less than 10mm), break early
      // This prevents having just a tiny bit of content at the bottom
      const shouldBreakEarly = remainingSpace < 10 && maxCellHeight > remainingSpace
      
      if (!willCurrentRowFit || shouldBreakEarly) {
        // Check if we can fit at least one more row on this page
        const rowsThatFit = getRowsForPage(rowIndex, currentY)
        
        // Only break if we can't fit this row or any subsequent rows
        if (rowsThatFit === 0) {
          // Current row doesn't fit - break to new page
          await drawPageFooter(pageNumber)
          doc.addPage(orientationParam as 'p' | 'l')
          pageNumber++
          await drawPageHeader()
          currentY = headerHeight + 15
          currentY = drawTableHeader(currentY, pageNumber)
          doc.setFont("helvetica", "normal")
          doc.setFontSize(7)
        }
      }

      // Alternate row background
      if (rowIndex % 2 === 1) {
        doc.setFillColor(249, 250, 251) // Lighter gray
        doc.rect(
          margin,
          currentY - 3,
          tableWidth,
          maxCellHeight,
          "F",
        )
      }

      // Row border
      doc.setLineWidth(0.1)
      doc.setDrawColor(229, 231, 235)
      doc.rect(
        margin,
        currentY - 3,
        tableWidth,
        maxCellHeight,
      )

      // Column separators
      let cellX = margin
      for (let i = 0; i < colWidths.length; i++) {
        if (i > 0) {
          doc.setDrawColor(229, 231, 235)
          doc.line(cellX, currentY - 3, cellX, currentY - 3 + maxCellHeight)
        }
        cellX += colWidths[i]
      }

      // Cell content with proper text wrapping
      doc.setTextColor(55, 65, 81)
      let xPos = margin
      cellLines.forEach((lines, index) => {
        const colWidth = colWidths[index]
        const totalTextHeight = lines.length * 4
        const startY = currentY + (maxCellHeight - totalTextHeight) / 2 + 1
        
        // Ensure text doesn't go beyond cell boundaries
        lines.forEach((line, lineIndex) => {
          const textY = startY + lineIndex * 4
          // Ensure text Y position is within cell bounds
          if (textY >= currentY - 3 && textY <= currentY - 3 + maxCellHeight - 2) {
            const safeTextWidth = Math.max(colWidth - 8, 10)
            // Final check and wrap if needed
            let finalLine = line
            if (doc.getTextWidth(line) > safeTextWidth) {
              const split = doc.splitTextToSize(line, safeTextWidth)
              finalLine = Array.isArray(split) ? split[0] : split
            }
            doc.text(finalLine, xPos + 4, textY, {
              maxWidth: safeTextWidth,
            })
          }
        })
        xPos += colWidth
      })
      currentY += maxCellHeight
      
      // Safety check: ensure currentY never exceeds page bounds
      if (currentY > availablePageHeight) {
        currentY = availablePageHeight
      }
    }

      // Only show total records for multiple records (not for single record)
      if (!hideTotalRecords) {
      // Check if total records section fits on current page
      const totalRecordsHeight = 15
      const spacingBeforeTotal = 10
      const totalNeededHeight = spacingBeforeTotal + totalRecordsHeight
      
      // Only break to new page if absolutely necessary (less than 5mm space left)
      const remainingSpace = availablePageHeight - currentY
      if (remainingSpace < totalNeededHeight && remainingSpace < 5) {
        // Need new page for total records only if very little space left
        await drawPageFooter(pageNumber)
        doc.addPage(orientationParam as 'p' | 'l')
        pageNumber++
        await drawPageHeader()
        currentY = headerHeight + 15
      } else {
        // Add spacing, but reduce if space is tight
        const actualSpacing = Math.min(spacingBeforeTotal, remainingSpace - totalRecordsHeight - 2)
        currentY += Math.max(actualSpacing, 5)
      }
      
      // Ensure we don't exceed page bounds
      if (currentY + totalRecordsHeight > availablePageHeight) {
        await drawPageFooter(pageNumber)
        doc.addPage(orientationParam as 'p' | 'l')
        pageNumber++
        await drawPageHeader()
        currentY = headerHeight + 15
      }
      
      doc.setFillColor(239, 246, 255) // Light blue background
      doc.rect(margin, currentY, availableWidth, totalRecordsHeight, "F")
      doc.setDrawColor(59, 130, 246)
      doc.setLineWidth(0.3)
      doc.rect(margin, currentY, availableWidth, totalRecordsHeight)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10) // Reduced font size to ensure it fits
      doc.setTextColor(30, 64, 175)
      const totalText = `Total Records: ${data.length}`
      // Ensure text fits within available width
      const textWidth = doc.getTextWidth(totalText)
      if (textWidth > availableWidth - 10) {
        doc.setFontSize(8)
      }
      doc.text(totalText, pageWidth / 2, currentY + 10, { align: "center", maxWidth: availableWidth - 10 })
      }
    }

    // Draw footer with logo on last page
    await drawPageFooter(pageNumber)

    doc.save(`${filename}${includeTimestamp ? `_${this.getTimestamp()}` : ""}.pdf`)
  }

  /**
   * Export data to JSON format
   */
  static exportToJSON<T>(data: T[], options: ExportOptions = {}): void {
    const { filename = "export", includeTimestamp = true } = options

    const jsonContent = JSON.stringify(data, null, 2)

    this.downloadFile(
      jsonContent,
      `${filename}${includeTimestamp ? `_${this.getTimestamp()}` : ""}.json`,
      "application/json",
    )
  }

  /**
   * Export data to Excel format (Enhanced with proper Excel formatting)
   */
  static exportToExcel<T>(data: T[], columns: ExportColumn[], options: ExportOptions = {}): void {
    const { filename = "export", title = "Data Export", includeTimestamp = true, hideTotalRecords = false } = options

    const headers = columns.map((col) => col.label)
    const rows = data.map((item) =>
      columns.map((col) => {
        const value = (item as any)[col.key]
        const formattedValue = col.format ? col.format(value, item) : String(value || "")
        return formattedValue
      }),
    )

    let excelContent = ""

    // Add title and metadata
    if (title) {
      excelContent += `"${title}"\n`
      excelContent += `"Generated on: ${new Date().toLocaleString()}"\n`
      if (!hideTotalRecords) {
        excelContent += `"Total Records: ${data.length}"\n`
      }
      excelContent += "\n" // Empty row for separation
    }

    // Add headers with proper Excel formatting
    const headerRow = headers.map((header) => `"${header.replace(/"/g, '""')}"`).join(",")
    excelContent += headerRow + "\n"

    // Add data rows with enhanced formatting
    rows.forEach((row) => {
      const dataRow = row
        .map((cell) => {
          const cellValue = String(cell || "")

          // Check if it's a number
          if (
            !isNaN(Number(cellValue)) &&
            cellValue !== "" &&
            !cellValue.includes("/") &&
            !cellValue.includes("-") &&
            cellValue.length < 15
          ) {
            return cellValue // Don't quote numbers
          }

          // Check if it's a date
          if (cellValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) || cellValue.match(/^\d{4}-\d{2}-\d{2}/)) {
            return `"${cellValue}"` // Quote dates
          }

          // Quote text and escape internal quotes
          return `"${cellValue.replace(/"/g, '""')}"`
        })
        .join(",")

      excelContent += dataRow + "\n"
    })

    if (!hideTotalRecords) {
      excelContent += "\n" // Empty row
      excelContent += `"Summary","Total Records: ${data.length}","Generated: ${new Date().toLocaleDateString()}"\n`
    }

    const BOM = "\uFEFF"
    const finalContent = BOM + excelContent

    this.downloadFile(
      finalContent,
      `${filename}${includeTimestamp ? `_${this.getTimestamp()}` : ""}.csv`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
  }

  /**
   * Generic file download utility
   */
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.style.display = "none"

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up
    URL.revokeObjectURL(url)
  }

  /**
   * Get formatted timestamp for filenames
   */
  private static getTimestamp(): string {
    const now = new Date()
    return (
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      "_" +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0") +
      now.getSeconds().toString().padStart(2, "0")
    )
  }

  /**
   * Format date values
   */
  static formatDate = (date: string | Date): string => {
    if (!date) return ""
    const d = new Date(date)
    return d.toLocaleDateString()
  }

  /**
   * Format datetime values
   */
  static formatDateTime = (date: string | Date): string => {
    if (!date) return ""
    const d = new Date(date)
    return d.toLocaleString()
  }

  /**
   * Format currency values
   */
  static formatCurrency = (amount: number): string => {
    if (amount == null) return ""
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  /**
   * Format status values
   */
  static formatStatus = (status: number): string => {
    switch (status) {
      case 1:
        return "Active"
      case 0:
        return "Inactive"
      case -1:
        return "Suspended"
      default:
        return "Unknown"
    }
  }

  /**
   * Load image from URL and convert to base64 for PDF embedding
   */
  static async loadImageAsBase64(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "Anonymous"

      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }

        const scaleFactor = 6
        canvas.width = Math.max(img.width, img.width * scaleFactor)
        canvas.height = Math.max(img.height, img.height * scaleFactor)

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const scaleX = canvas.width / img.width
        const scaleY = canvas.height / img.height
        const scale = Math.min(scaleX, scaleY)

        const x = (canvas.width - img.width * scale) / 2
        const y = (canvas.height - img.height * scale) / 2

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale)

        try {
          const dataUrl = canvas.toDataURL("image/png", 1.0)
          resolve(dataUrl)
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imageUrl}`))
      }

      img.src = imageUrl
    })
  }

  /**
   * Convert a chart container element to a base64 image
   */
  static async chartToImage(element: HTMLElement | null): Promise<string | null> {
    if (!element) {
      return null
    }

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
        allowTaint: false,
      })
      return canvas.toDataURL('image/png', 1.0)
    } catch (error) {
      console.error('Error converting chart to image:', error)
      return null
    }
  }

  /**
   * Convert multiple chart containers to images
   */
  static async chartsToImages(elements: Array<{ element: HTMLElement | null; title: string }>): Promise<ChartImage[]> {
    const chartImages: ChartImage[] = []
    
    for (const { element, title } of elements) {
      if (element) {
        const imageData = await this.chartToImage(element)
        if (imageData) {
          chartImages.push({
            title,
            imageData,
            width: element.offsetWidth,
            height: element.offsetHeight,
          })
        }
      }
    }
    
    return chartImages
  }
}

export default ExportUtils
