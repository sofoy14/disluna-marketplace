const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://givjfonqaiqhsjjjzedc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdpdmpmb25xYWlxaHNqamp6ZWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODc1NzIsImV4cCI6MjA2Nzc2MzU3Mn0.I5CoIzZF_Rd00ZoQ43urSUTEnXxqmJEMzP7sLptNZw4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Lista de correos electrónicos
const emails = [
  'fapn.abogado@gmail.com',
  'alejorojaspereira@hotmail.com',
  'jefferson.granobles1@gmail.com',
  'dora.angelicaperez@gmail.com',
  'hidroacui@gmail.com',
  'Cindy01villa@gmail.com',
  'sarmientovargas1967@hotmail.com',
  'Javimarsar@hotmail.com'
];

const password = '123456';

async function createUsers() {
  console.log('Iniciando creación de usuarios...');
  
  for (const email of emails) {
    try {
      console.log(`Creando usuario: ${email}`);
      
      // Crear usuario usando la API de Supabase
      const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true // Confirmar email automáticamente
      });
      
      if (error) {
        console.error(`Error creando usuario ${email}:`, error.message);
        continue;
      }
      
      console.log(`✅ Usuario creado exitosamente: ${email}`);
      console.log(`   ID: ${data.user.id}`);
      
      // Crear perfil para el usuario
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          display_name: email.split('@')[0],
          username: email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_'),
          bio: 'Abogado profesional',
          has_onboarded: true,
          image_url: '',
          image_path: '',
          profile_context: 'Abogado especializado en derecho',
          use_azure_openai: false
        });
      
      if (profileError) {
        console.error(`Error creando perfil para ${email}:`, profileError.message);
      } else {
        console.log(`✅ Perfil creado para: ${email}`);
      }
      
    } catch (err) {
      console.error(`Error inesperado para ${email}:`, err.message);
    }
  }
  
  console.log('Proceso completado.');
}

// Ejecutar el script
createUsers().catch(console.error);
