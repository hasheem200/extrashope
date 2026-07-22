module.exports = async function (
  to,
  subject,
  message
) {

  console.log("EMAIL DISABLED");
  console.log("To:", to);
  console.log("Subject:", subject);

  return true;

};