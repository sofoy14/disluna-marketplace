import zipfile
import os
import shutil
import pandas as pd

# Paths
xlsx_path = 'Productos-1.xlsx'
extract_path = 'temp_productos1_images'
output_path = 'public/images/products'
backup_path = 'public/images/products_backup'

# Mapeo de SKU a nombre de archivo basado en los archivos actuales
sku_to_filename = {
    92736: 'brisa-lima-limon-600ml-6.png',
    92740: 'brisa-lima-limon-15lt-pet-12.png',
    92768: 'brisa-manzana-280ml-pet-24.png',
    92769: 'brisa-manzana-600ml-6.png',
    160170: 'brisa-gas-lim-280ml-pet-24.png',
    160046: 'agua-brisa-gas-pet-600ml-24.png',
    160008: 'brisa-ecoflex-1-litro-6.png',
    160047: 'agua-brisa-pet-600ml-24.png',
    135664: 'coca-cola-15lt-pet12-nvo.png',
    135665: 'coca-cola-2lt-rp9-nvo.png',
    135666: 'coca-cola-125lt-rgb12-nvo.png',
    135718: 'coca-cola-so-8oz-vir-30.png',
    135760: 'coca-cola-saz-400ml-pet12kz.png',
    135763: 'coca-cola-saz-350ml-vr30kz.png',
    136415: 'coca-cola-so-500ml-pet-12.png',
    160053: 'coca-cola-350ml-vir30.png',
    160200: 'coca-cola-250-ml-12.png',
    160318: 'coca-cola-400ml-pet-12.png',
    160121: 'powerade-ion4-ft-500ml-pet6.png',
    160122: 'powerade-ion4-mb-500ml-pet6.png',
    120117: 'fresh-citrus-400ml-pet-12nvo.png',
    120118: 'fresh-citrus-15lt-pet12nvo.png',
    120119: 'fresh-citrus-25lt-pet8nvo.png',
    120159: 'fresh-mandarina-15lt-pet12nvo.png',
    120160: 'fresh-mandarina-25-lt-pet-8nvo.png',
    56452: 'schweppes-soda-400ml-pet12.png',
    56453: 'schweppes-ginger-400ml-pet12.png',
    56703: 'quatro-choice-250ml-pet-12.png',
    56705: 'quatro-choice-350ml-vir30.png',
    56706: 'quatro-choice-400ml-nr-12.png',
    56708: 'quatro-choice-125lt-vir12.png',
    56709: 'quatro-choice-15-lt-pet-12.png',
    160100: 'schweppes-ginger-15-lt-nr-12.png',
    160101: 'schweppes-soda-15-lt-nr-12.png',
    160102: 'sprite-15l-pet-12.png',
    160124: 'sprite-3-lts-pet-6.png',
    160297: 'sprite-400-ml-nr-12.png',
}

print("=" * 60)
print("EXTRAYENDO IMAGENES DE PRODUCTOS-1.XLSX")
print("=" * 60)

# Extraer imágenes del xlsx
if os.path.exists(extract_path):
    shutil.rmtree(extract_path)
os.makedirs(extract_path)

with zipfile.ZipFile(xlsx_path, 'r') as z:
    image_files = [f for f in z.namelist() if f.startswith('xl/media/')]
    for img_path in image_files:
        z.extract(img_path, extract_path)

# Leer el Excel para obtener SKUs en orden
df = pd.read_excel(xlsx_path, header=1)
skus = df['Sku'].tolist()

# Listar las imágenes extraídas en orden numérico
media_path = os.path.join(extract_path, 'xl', 'media')
images = sorted([f for f in os.listdir(media_path) if f.endswith(('.png', '.jpg', '.jpeg'))],
                key=lambda x: int(''.join(filter(str.isdigit, x)) or 0))

print(f"\nProductos en Excel: {len(skus)}")
print(f"Imagenes extraídas: {len(images)}")

# Backup de imágenes actuales
if os.path.exists(backup_path):
    print(f"\nBackup ya existe en: {backup_path}")
else:
    print(f"\nCreando backup en: {backup_path}")
    shutil.copytree(output_path, backup_path)

# Reemplazar imágenes
print(f"\nReemplazando imágenes en: {output_path}")
print("-" * 60)

total_size_before = 0
total_size_after = 0

for i, (sku, img_name) in enumerate(zip(skus, images)):
    if sku in sku_to_filename:
        target_filename = sku_to_filename[sku]
        source_path = os.path.join(media_path, img_name)
        target_path = os.path.join(output_path, target_filename)
        
        # Tamaño anterior
        if os.path.exists(target_path):
            total_size_before += os.path.getsize(target_path)
        
        # Copiar nueva imagen
        shutil.copy2(source_path, target_path)
        new_size = os.path.getsize(target_path)
        total_size_after += new_size
        
        size_kb = new_size / 1024
        print(f"{i+1:2d}. {target_filename:<40} {size_kb:>8.1f} KB")
    else:
        print(f"{i+1:2d}. SKU {sku} no encontrado en mapeo!")

print("-" * 60)
print(f"Tamaño total antes: {total_size_before/1024:.1f} KB")
print(f"Tamaño total después: {total_size_after/1024:.1f} KB")
print(f"Mejora: {total_size_after/total_size_before:.1f}x mayor")
print("=" * 60)
print("\n✓ Imágenes reemplazadas exitosamente!")

# Limpiar temp
shutil.rmtree(extract_path)
print("✓ Archivos temporales limpiados")
