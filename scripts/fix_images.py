import os
from PIL import Image

input_dir = 'public/images/products'
backup_dir = 'public/images/products_backup'
temp_dir = 'public/images/products_temp'

# Crear directorio temporal
os.makedirs(temp_dir, exist_ok=True)

print("Re-convirtiendo imagenes para asegurar compatibilidad...")

for filename in os.listdir(input_dir):
    if filename.endswith('.png'):
        input_path = os.path.join(input_dir, filename)
        temp_path = os.path.join(temp_dir, filename)
        
        try:
            # Abrir y re-guardar la imagen
            img = Image.open(input_path)
            
            # Convertir a RGB si es necesario (quitar transparencia)
            if img.mode == 'RGBA':
                # Crear fondo blanco
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])  # Usar canal alpha como máscara
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Guardar como PNG optimizado
            img.save(temp_path, 'PNG', optimize=True)
            
            old_size = os.path.getsize(input_path)
            new_size = os.path.getsize(temp_path)
            print(f"{filename}: {old_size/1024:.1f}KB -> {new_size/1024:.1f}KB")
            
        except Exception as e:
            print(f"ERROR en {filename}: {e}")

print("\nReemplazando imagenes originales...")
for filename in os.listdir(temp_dir):
    src = os.path.join(temp_dir, filename)
    dst = os.path.join(input_dir, filename)
    os.replace(src, dst)

# Limpiar
os.rmdir(temp_dir)
print("OK: Imagenes re-convertidas exitosamente")
