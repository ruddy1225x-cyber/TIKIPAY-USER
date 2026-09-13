# TikiPay

TikiPay es una plataforma web fintech orientada a pagos digitales,
transferencias, servicios y membresías Web3.

## Funciones principales

- Registro e inicio de sesión con Supabase Auth
- Dashboard de saldo y actividad
- Transferencias entre usuarios TikiPay
- Registro de movimientos
- Recepción mediante TIKI-ID y código QR
- Notificaciones
- Perfil, seguridad y preferencias
- Soporte Español / English
- Servicios TikiPay
- TikiPay Access con Unlock Protocol
- Integración con MetaMask
- Membresías NFT en Base Sepolia
- Verificación de membresía on-chain
- Sincronización segura Blockchain → Supabase

## Tecnologías

- HTML5
- CSS3
- JavaScript
- Supabase
- PostgreSQL
- Supabase Edge Functions
- Unlock Protocol
- MetaMask
- Ethers.js
- Base Sepolia

## TikiPay Access

El módulo TikiPay Access utiliza Unlock Protocol para crear
membresías Web3.

Lock de demostración:

0x151eF764492Be15691eaB0439AF59Bde92DccB42

Red:

Base Sepolia - Chain ID 84532

El flujo implementado es:

TikiPay → MetaMask → Unlock Protocol → NFT Membership →
verificación on-chain → Edge Function → Supabase.

## Seguridad

- Las claves privadas y frases semilla nunca son solicitadas por TikiPay.
- El navegador no puede modificar directamente los saldos.
- Las transferencias se ejecutan mediante una función segura del servidor.
- La membresía Web3 se verifica en blockchain.
- La propiedad de la wallet se demuestra mediante firma de MetaMask.
- Los accesos se sincronizan con Supabase desde una Edge Function.

## Estado

MVP funcional desarrollado para demostración académica / Buildathon.

## Autor

TikiPay