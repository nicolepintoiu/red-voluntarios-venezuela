// ══════════════════════════════════════════════════════════
//  Amazon SES — envio transaccional desde Google Apps Script
//  Requiere Script Properties:
//    AWS_ACCESS_KEY_ID
//    AWS_SECRET_ACCESS_KEY
//    AWS_SES_REGION  (opcional, default us-east-1)
// ══════════════════════════════════════════════════════════

function getAwsConfig() {
  const props = PropertiesService.getScriptProperties();
  const accessKeyId = props.getProperty('AWS_ACCESS_KEY_ID');
  const secretAccessKey = props.getProperty('AWS_SECRET_ACCESS_KEY');
  const region = props.getProperty('AWS_SES_REGION') || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Faltan AWS_ACCESS_KEY_ID o AWS_SECRET_ACCESS_KEY en Script Properties.');
  }

  return { accessKeyId, secretAccessKey, region };
}

function enviarCorreoSes(toEmail, toName, subject, htmlBody, textBody, fromEmail, fromName) {
  const cfg = getAwsConfig();
  const region = cfg.region;
  const host = 'email.' + region + '.amazonaws.com';
  const source = fromName ? fromName + ' <' + fromEmail + '>' : fromEmail;
  const text = textBody || stripHtml(htmlBody);

  const params = {
    Action: 'SendEmail',
    'Destination.ToAddresses.member.1': toEmail,
    'Message.Body.Html.Charset': 'UTF-8',
    'Message.Body.Html.Data': htmlBody,
    'Message.Body.Text.Charset': 'UTF-8',
    'Message.Body.Text.Data': text,
    'Message.Subject.Charset': 'UTF-8',
    'Message.Subject.Data': subject,
    Source: source,
  };

  const body = Object.keys(params)
    .sort()
    .map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
    .join('&');

  const amzdate = Utilities.formatDate(new Date(), 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  const dateStamp = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd');
  const service = 'ses';
  const signedHeaders = 'content-type;host;x-amz-date';
  const payloadHash = sesSha256(body);
  const canonicalHeaders =
    'content-type:application/x-www-form-urlencoded\n' +
    'host:' + host + '\n' +
    'x-amz-date:' + amzdate + '\n';
  const canonicalRequest =
    'POST\n/\n\n' +
    canonicalHeaders + '\n' +
    signedHeaders + '\n' +
    payloadHash;
  const credentialScope = dateStamp + '/' + region + '/' + service + '/aws4_request';
  const stringToSign =
    'AWS4-HMAC-SHA256\n' +
    amzdate + '\n' +
    credentialScope + '\n' +
    sesSha256(canonicalRequest);
  const signingKey = sesGetSignatureKey(cfg.secretAccessKey, dateStamp, region, service);
  const signature = sesToHex(Utilities.computeHmacSha256Signature(stringToSign, signingKey));
  const authorization =
    'AWS4-HMAC-SHA256 Credential=' + cfg.accessKeyId + '/' + credentialScope +
    ', SignedHeaders=' + signedHeaders +
    ', Signature=' + signature;

  const response = UrlFetchApp.fetch('https://' + host + '/', {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Amz-Date': amzdate,
      Authorization: authorization,
    },
    payload: body,
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  if (code >= 400) {
    throw new Error('SES error ' + code + ': ' + response.getContentText());
  }
}

function sesHmac(keyBytes, message) {
  return Utilities.computeHmacSha256Signature(message, keyBytes);
}

function sesGetSignatureKey(secretKey, dateStamp, region, service) {
  const kDate = sesHmac(Utilities.newBlob('AWS4' + secretKey).getBytes(), dateStamp);
  const kRegion = sesHmac(kDate, region);
  const kService = sesHmac(kRegion, service);
  return sesHmac(kService, 'aws4_request');
}

function sesSha256(input) {
  return sesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8));
}

function sesToHex(bytes) {
  return bytes.map(function(b) {
    const v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}
