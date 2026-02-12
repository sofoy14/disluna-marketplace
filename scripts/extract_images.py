import zipfile
import os
import shutil
import pandas as pd

# Paths
xlsx_path = 'Productos-1.xlsx'
extract_path = 'temp_productos1_images'
output_path = 'public/images/products'
backup_path = 'public/images/products_old'

# Leer el Excel para obtener los nombres de productos
df = pd.read_excel(xlsx_path, header=1)
print("Columnas:", df.columns.tolist())
print(f"\nTotal de productos: {len(df)}")
print("\nPrimeros 10 productos:")
print(df[['Sku', 'ARTNAM']].head(10).to_string(index=False))

# Extraer imágenes del xlsx
if os.path.exists(extract_path):
    shutil.rmtree(extract_path)
os.makedirs(extract_path)

with zipfile.ZipFile(xlsx_path, 'r') as z:
    image_files = [f for f in z.namelist() if f.startswith('xl/media/')]
    print(f'\nImagenes encontradas en xlsx: {len(image_files)}')
    for img_path in image_files:
        z.extract(img_path, extract_path)

# Listar las imágenes extraídas en orden numérico
media_path = os.path.join(extract_path, 'xl', 'media')
images = sorted([f for f in os.listdir(media_path) if f.endswith(('.png', '.jpg', '.jpeg'))],
                key=lambda x: int(''.join(filter(str.isdigit, x)) or 0))

print(f'Imagenes ordenadas: {images[:5]}... (total: {len(images)})')

# Verificar que tengamos 37 imágenes y 37 productos
if len(images) != len(df):
    print(f"\nADVERTENCIA: {len(images)} imagenes pero {len(df)} productos!")
else:
    print(f"\nOK: {len(images)} imagenes y {len(df)} productos coinciden")
