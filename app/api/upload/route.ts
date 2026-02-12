import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";

// Configuración
const UPLOAD_DIR = join(process.cwd(), "public", "images", "products");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Asegurar que el directorio de uploads existe
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Generar nombre único para el archivo
function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split(".").pop();
  const baseName = originalName.replace(`.${extension}`, "").toLowerCase().replace(/[^a-z0-9]/g, "-");
  return `${baseName}-${timestamp}-${randomString}.${extension}`;
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const fileType = file.type;
    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${fileType}. Tipos permitidos: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo es demasiado grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generar nombre único
    const fileName = generateUniqueFileName(file.name);
    const filePath = join(UPLOAD_DIR, fileName);

    // Guardar archivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Retornar URL pública
    const publicUrl = `/images/products/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      size: file.size,
      type: fileType,
    });

  } catch (error) {
    console.error("Error al subir imagen:", error);
    return NextResponse.json(
      { error: "Error al subir la imagen" },
      { status: 500 }
    );
  }
}

// Manejar OPTIONS para CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
