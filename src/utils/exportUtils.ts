// PDF generation with jsPDF library

import { jsPDF } from "jspdf"

export interface ExportColumn {
  key: string
  label: string
  format?: (value: any, row?: any) => string
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
    } = options

    // Use specific logos if provided, otherwise fall back to logoUrl for both sides
    const leftLogo = leftLogoUrl
    const rightLogo = rightLogoUrl

    const doc = new jsPDF()

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20 // Increased margin for better spacing
    const headerHeight = 45 // Increased header height for better layout
    let currentY = headerHeight

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

    // Footer drawing function
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

    // ===== ENHANCED TABLE LOGIC =====
    const headers = columns.map((col) => col.label)
    const rows = data.map((item) =>
      columns.map((col) => {
        const value = (item as any)[col.key]
        return col.format ? col.format(value, item) : String(value || "")
      }),
    )

    const availableWidth = pageWidth - 2 * margin
    const minColWidth = 20 // Increased minimum width for better readability
    const maxColWidth = 50 // Increased maximum width

    const colWidths: number[] = []
    headers.forEach((header, index) => {
      const headerWidth = doc.getTextWidth(header) + 8 // More padding
      const sampleRows = rows.length > 30 ? rows.slice(0, 30) : rows
      const maxDataWidth = Math.max(
        ...sampleRows.map((row) => {
          const cellText = String(row[index] || "")
          if (!cellText || cellText === "undefined" || cellText === "null") return 0
          const lines = doc.splitTextToSize(cellText, maxColWidth - 8)
          if (Array.isArray(lines)) {
            return Math.max(...lines.map((line: string) => doc.getTextWidth(line))) + 8
          } else {
            return doc.getTextWidth(lines) + 8
          }
        }),
      )
      const optimalWidth = Math.max(headerWidth, maxDataWidth, minColWidth)
      colWidths.push(Math.min(optimalWidth, maxColWidth))
    })

    const totalWidth = colWidths.reduce((sum, width) => sum + width, 0)
    if (totalWidth > availableWidth) {
      const scaleFactor = availableWidth / totalWidth
      colWidths.forEach((width, index) => {
        colWidths[index] = Math.max(width * scaleFactor, minColWidth)
      })
    }

    const drawTableHeader = (yPos: number, pageNumber: number) => {
      const headerHeight = 10 // Increased height
      // Gradient-like header background
      doc.setFillColor(59, 130, 246) // Professional blue
      doc.rect(
        margin,
        yPos - 5,
        colWidths.reduce((a, b) => a + b, 0),
        headerHeight,
        "F",
      )

      // Header border
      doc.setLineWidth(0.2)
      doc.setDrawColor(37, 99, 235)
      doc.rect(
        margin,
        yPos - 5,
        colWidths.reduce((a, b) => a + b, 0),
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
      doc.setFontSize(8) // Slightly larger
      let xPos = margin
      headers.forEach((header, index) => {
        const colWidth = colWidths[index]
        const headerText = String(header)
        const maxTextWidth = colWidth - 4
        const lines = doc.splitTextToSize(headerText, maxTextWidth)
        if (Array.isArray(lines)) {
          lines.forEach((line, lineIndex) => {
            doc.text(line, xPos + 2, yPos + lineIndex * 4)
          })
        } else {
          doc.text(headerText || "", xPos + 2, yPos)
        }
        xPos += colWidth
      })
      return yPos + 8
    }

    let pageNumber = 1
    currentY += 15 // More space before table
    currentY = drawTableHeader(currentY, pageNumber)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7) // Slightly larger for better readability
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex]
      let xPos = margin
      let maxCellHeight = 8 // Increased minimum height
      const cellLines: string[][] = []

      row.forEach((_, index) => {
        const colWidth = colWidths[index]
        const cellText = String(row[index] || "")
        const lines = doc.splitTextToSize(cellText, colWidth - 6)
        cellLines.push(Array.isArray(lines) ? lines : [lines])
        const cellHeight = (Array.isArray(lines) ? lines.length : 1) * 4 + 4
        maxCellHeight = Math.max(maxCellHeight, cellHeight)
      })

      // Check for page break
      if (currentY + maxCellHeight > pageHeight - margin - 15) {
        await drawPageFooter(pageNumber, Math.ceil(data.length / 25))
        doc.addPage()
        pageNumber++
        await drawPageHeader()
        currentY = headerHeight + 15
        currentY = drawTableHeader(currentY, pageNumber)
        doc.setFontSize(7)
      }

      if (rowIndex % 2 === 1) {
        doc.setFillColor(249, 250, 251) // Lighter gray
        doc.rect(
          margin,
          currentY - 3,
          colWidths.reduce((a, b) => a + b, 0),
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
        colWidths.reduce((a, b) => a + b, 0),
        maxCellHeight,
      )

      // Column separators
      let cellX = margin
      for (let i = 0; i < colWidths.length; i++) {
        if (i > 0) {
          doc.line(cellX, currentY - 3, cellX, currentY - 3 + maxCellHeight)
        }
        cellX += colWidths[i]
      }

      // Cell content
      doc.setTextColor(55, 65, 81) // Better text color
      xPos = margin
      cellLines.forEach((lines, index) => {
        const colWidth = colWidths[index]
        const totalTextHeight = lines.length * 4
        const startY = currentY + (maxCellHeight - totalTextHeight) / 2 + 1
        lines.forEach((line, lineIndex) => {
          let clippedLine = line
          if (doc.getTextWidth(line) > colWidth - 6) {
            const split = doc.splitTextToSize(line, colWidth - 6)
            clippedLine = Array.isArray(split) ? split[0] : split
          }
          doc.text(clippedLine, xPos + 3, startY + lineIndex * 4, {
            maxWidth: colWidth - 6,
          })
        })
        xPos += colWidth
      })
      currentY += maxCellHeight
    }

    currentY += 15
    doc.setFillColor(239, 246, 255) // Light blue background
    doc.rect(margin, currentY, availableWidth, 15, "F")
    doc.setDrawColor(59, 130, 246)
    doc.setLineWidth(0.3)
    doc.rect(margin, currentY, availableWidth, 15)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(30, 64, 175)
    doc.text(`Total Records: ${data.length}`, pageWidth / 2, currentY + 10, { align: "center" })

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
    const { filename = "export", title = "Data Export", includeTimestamp = true } = options

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
      excelContent += `"Total Records: ${data.length}"\n`
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

    excelContent += "\n" // Empty row
    excelContent += `"Summary","Total Records: ${data.length}","Generated: ${new Date().toLocaleDateString()}"\n`

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
}

export default ExportUtils
