module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "prohibit makeStyles from material-ui in new code",
      recommended: true,
    },
    fixable: "code",
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === "@material-ui/core" || node.source.value === "@material-ui/lab") {
          const makeStylesSpecifier = node.specifiers.find(
            (s) => s.imported && (s.imported.name === "makeStyles" || s.imported.name === "withStyles")
          );
          if (makeStylesSpecifier) {
            context.report({
              node: makeStylesSpecifier,
              message: "makeStyles/withStyles is deprecated in Watink. Use Tailwind CSS instead.",
            });
          }
        }
      },
    };
  },
};
