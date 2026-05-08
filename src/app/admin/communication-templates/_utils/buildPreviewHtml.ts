export function buildPreviewHtml(body: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #474747; background: #ffffff; }
    a { color: inherit; }
    .header {
      width: 100%; height: 112px; display: flex; align-items: center;
      background: url('https://storage.googleapis.com/cvtocareer-394713.appspot.com/laigusbucket/fe7106d822c5b666aa1438302.png?GoogleAccessId=firebase-adminsdk-f76vf%40cvtocareer-394713.iam.gserviceaccount.com&Expires=4070905200&Signature=REn%2BHmlB6nKx9ByvLul6s98zSxQSYMzGQFPgczEjTyaT7uwEStDMjX9u6x4Qlv6tIj81E48M7rQzcQoz0kTprSrdPIKYv%2Bmg8isI6HpZnExpMKhGR2UML1g8UyiGYCMpYXAV4Ach8TnpncMfR20eG6AORMqXwCNvYrbgnI50ozrfO63%2BjCVUhpTfDAQLJ8i%2BL7thO4x%2Fy99doqDlVvckO1d0WmKTPNplIV24oYZ583t5LFeJUi9TDE0xUGTMeAOwuh7ysSHu7FEgyD8k9AJFFS%2Fb%2BQqzAhgIWzoa4dbc3Xlym16KjLvf899KPwZTi9%2F2DjKrnx0HfacpYBAzZlwncA%3D%3D') left center no-repeat,
      linear-gradient(90deg, #004174 0%, #00568F 100%);
    }
    .header-inner { margin: 0 auto; text-align: center; }
    .body-section { padding: 20px; }
    .body-inner { max-width: 600px; margin: 0 auto; }
    h1.subject { font-size: 2rem; text-align: left; padding: 20px 0; font-weight: 500; line-height: 1.2; color: #474747; }
    .content { background: white; }
    .content p { margin-bottom: 12px; line-height: 1.6; }
    .best-regards { margin-top: 20px; }
    .footer { background: #F9F9F9; padding: 32px; text-align: center; }
    .footer-logo { margin: 0 auto 12px; display: block; }
    .social-links { margin: 12px 0; }
    .social-links a { display: inline-block; padding: 0 6px; vertical-align: middle; }
    .footer-links { margin-top: 16px; color: #6b7280; font-size: 0.85rem; }
    .footer-links a { color: #6b7280; text-decoration: none; }
    .footer-links a:hover { text-decoration: underline; }
    .copyright { margin: 16px 0; font-size: 0.85rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <img
        src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/laigusbucket/2e27bcd945e75fedea70bcf00.png?GoogleAccessId=firebase-adminsdk-f76vf%40cvtocareer-394713.iam.gserviceaccount.com&Expires=4070905200&Signature=WHSAuRK97TEwVmAGtHl0%2FCFlzKett%2BAda2QjvZp1N4JIeOldwysS1FHZb45ebrAFnACy6CQZkCdGVUwuiMEZtzfnQuTVZaDuOCJez4vHT7b16oP%2Bd5o8QvaxKfub6g%2BsEYfKUbYt%2F%2Fh2hhgIREG5Wl%2F8rick5bZexhrBAr01cE2U1On7DNrE5mezpornhHz1%2FVU2joPM3AC4fwwxjbMhmh%2FxC1jVylwSTNFWjkdbdDTKiQwqnDYnma4muh15SXTiGxiyhitJqoBlhkPt4nGTH8XKdb8LVP0ZWORjFZVjmny%2BgXBOjOIuQYjZ9hhb8fOdFowkeinWZrL5voqMFychzA%3D%3D"
        alt="CV To Career" width="149" height="32"
      />
    </div>
  </div>

  <div class="body-section">
    <div class="body-inner">
      <h1 class="subject">${subject}</h1>
      <div class="content">
        ${body || '<h2 style="font-size:1.5rem;font-weight:700;margin:24px 0;">{{ Template }}</h2>'}
      </div>
      <p class="best-regards">Best regards,<br />CVtoCAREER</p>
    </div>
  </div>

  <div class="footer">
    <img
      class="footer-logo"
      src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/laigusbucket/bea7d3a092f0710b014b1f203.png?GoogleAccessId=firebase-adminsdk-f76vf%40cvtocareer-394713.iam.gserviceaccount.com&Expires=4070905200&Signature=gWB9jqmAcwN9nLbugMdOj%2FD0BROrGRX4a8qnGa9cZGuOkc0Z2M9itk0pzUtoUtyedrxv%2B2hO%2BFqDqlduJ6J7WqVBAJ3wQ17oe72S5BwTvRXEY3Q7OM%2B9wuxsFsSwgrtfldf79sly6nIJQCXqb94FDFL661YxCbeGN%2BIq0j2volsUvmKtParJXXLo3LO%2BBmOms1nVf6HHldXbD%2FfMno5f%2FB8wj%2FLDF%2FvMk5LfTsISh0kSOXmvfRNQvktImOAH2rTt%2B6ejVByGrxstPLhViGGI0BSIWEOn0oFaihxHK3Lo%2B3T0WePp5Q0PoYFrERpTtGReyZFGIVc%2Bs%2B9PReVzHoL86g%3D%3D"
      alt="CV To Career" width="35" height="25"
    />
    <div class="social-links">
      <a href="https://facebook.com" target="_blank" rel="noopener"><img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/screenshots/Facebook%20svg.png" alt="Facebook" width="24" height="24" /></a>
      <a href="https://x.com/cvtocareer" target="_blank" rel="noopener"><img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/screenshots/X%20svg%20(1).png" alt="X" width="24" height="24" /></a>
      <a href="https://youtube.com/@CVTOCAREER" target="_blank" rel="noopener"><img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/screenshots/YouTube%20svg.png" alt="YouTube" width="24" height="24" /></a>
      <a href="mailto:support@laigus.com"><img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/screenshots/mail.png" alt="Email" width="24" height="24" /></a>
      <a href="https://www.instagram.com/cvtocareer" target="_blank" rel="noopener"><img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/screenshots/Instagram.png" alt="Instagram" width="24" height="24" /></a>
      <a href="https://www.linkedin.com/company/cvtocareer/" target="_blank" rel="noopener"><img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/screenshots/linkedln.png" alt="LinkedIn" width="24" height="24" /></a>
      <a href="https://www.google.com/search?q=cvtocareer.com"><img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/screenshots/uim--google.png" alt="Google" width="24" height="24" /></a>
      <a href="https://www.tiktok.com/@cvtocareer?lang=en"><img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/screenshots/mingcute--tiktok-fill.png" alt="TikTok" width="24" height="24" /></a>
    </div>
    <p class="copyright">© ${new Date().getFullYear()} CVtoCAREER. All rights reserved.</p>
    <p class="footer-links">
      <a href="https://laigus.com" target="_blank" rel="noopener">Unsubscribe</a>
      &nbsp;&nbsp;|&nbsp;&nbsp;
      <a href="https://laigus.com/privacy-policy" target="_blank" rel="noopener">Privacy Policy</a>
      &nbsp;&nbsp;|&nbsp;&nbsp;
      <a href="https://laigus.com" target="_blank" rel="noopener">Web</a>
    </p>
  </div>
</body>
</html>`;
}
