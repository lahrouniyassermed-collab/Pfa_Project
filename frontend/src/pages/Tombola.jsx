python -c "
content = '''DATABASE_URL=sqlite:///./mangermanger.db
SECRET_KEY=sky07secretkey2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
RESEND_API_KEY=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
RESTAURANT_NAME=MangerManger
GEMINI_API_KEY=AIzaSyDn3xy87NaijFHz0BBrieVc8nxUYVxxHG4
'''
open('.env', 'w', encoding='utf-8').write(content)
print('OK')
"