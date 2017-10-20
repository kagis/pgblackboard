export default statement => statement.split(/^(\s|--.*|\/\*[^]*?\*\/)*/)[2];
