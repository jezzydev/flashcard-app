export const togglePassword = (id) => {
    const pw = document.getElementById(id);
    console.log('HERE');
    pw.type = pw.type === 'password' ? 'text' : 'password';
};
