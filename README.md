# Genel Sohbet

Takma adla girilen, bütün ziyaretçilerin birbirinin mesajlarını **anlık** gördüğü basit bir genel sohbet sitesi. Hesap veya veritabanı gerekmez.

## Çalıştır

1. Bilgisayarında **Node.js 18 veya üstü** kurulu olmalı.
2. Bu klasörde terminal aç.
3. Şunu çalıştır:

   ```bash
   npm start
   ```

4. Tarayıcıda **http://localhost:3000** adresine git.
5. Farklı iki sekmede açıp mesajlaşmayı test edebilirsin.

**İnternette herkesin kullanması için** klasörü Node.js destekleyen, sürekli çalışan bir sunucuda barındır ve `npm start` komutunu başlat. Barındırma hizmetinin verdiği HTTPS adresi üzerinden tüm ziyaretçiler aynı genel sohbeti görebilir. Servis `PORT` ortam değişkenini destekler.

## Bilmen gerekenler

- Son **100 mesaj** sunucu belleğinde saklanır, sunucu yeniden başladığında silinir.
- Takma adlar doğrulanmaz; herkes istediği takma adı kullanabilir.
- Basit IP hız sınırı ve güvenli metin gösterimi bulunur. Küçük bir genel sohbet demosu için uygundur; geniş kitleye açık kullanımda daha kapsamlı moderasyon, kalıcı veritabanı ve spam koruması eklenmelidir.
- Aynı sunucunun tek örneği kullanılmalıdır: birden fazla bağımsız sunucu örneğinin mesajları bu sürümde birbirine aktarılmaz.
