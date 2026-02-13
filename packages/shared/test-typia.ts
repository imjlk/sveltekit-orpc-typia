import typia from 'typia';

interface Input {
  title: string;
  content: string;
}

const result = typia.validate<Input>({ title: 'ab', content: 'test' });
console.log(JSON.stringify(result, null, 2));
console.log('success:', result.success);
if (!result.success) {
  console.log('errors:', result.errors);
}
