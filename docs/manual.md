> **Nota:** o nome oficial da plataforma é **FinanceTable**. Este manual foi escrito quando ela se chamava "FinanceFlow" e está mantido como no original.

# FinanceFlow
## Manual de funcionamento da plataforma

**Versão:** 1.0  
**Objetivo:** Organizar e controlar as finanças pessoais de maneira simples, visual e segura.

---

## 1. Apresentação da plataforma

O FinanceFlow é uma plataforma de controle financeiro pessoal que permite ao usuário registrar suas receitas, despesas, acompanhar seu saldo e entender melhor como está utilizando seu dinheiro.

A plataforma deve ajudar o usuário a responder perguntas como:

- Quanto dinheiro tenho disponível?
- Quanto recebi neste mês?
- Quanto gastei?
- Em que estou gastando mais?
- Estou conseguindo economizar?
- Quanto falta para alcançar minhas metas financeiras?

O objetivo é reunir essas informações em um único lugar, apresentando tudo de maneira organizada e fácil de entender.

## 2. Como a plataforma será organizada

A plataforma será dividida nas seguintes áreas:

1. Tela de apresentação e acesso.
2. Cadastro de usuário.
3. Página inicial (resumo financeiro).
4. Receitas e despesas.
5. Categorias.
6. Metas financeiras.
7. Relatórios.
8. Perfil e configurações.

Cada área terá uma finalidade específica e deverá funcionar de maneira integrada às demais.

---

## 3. Tela de apresentação e acesso

### O que o usuário verá

Ao acessar o FinanceFlow, o usuário encontrará uma tela de entrada com a identidade visual da plataforma.

Nela estarão disponíveis as opções de entrar na conta ou criar um cadastro.

### O que o usuário poderá fazer

- Informar seu e-mail e senha para entrar.
- Acessar a tela de cadastro.
- Solicitar a recuperação de senha caso tenha esquecido seus dados.

### O que deverá acontecer

Ao informar os dados de acesso, a plataforma deverá verificar se eles estão corretos.

Se estiverem corretos, o usuário será direcionado à página inicial de suas finanças.

Se estiverem incorretos, será apresentada uma mensagem explicando que não foi possível entrar.

Cada usuário deverá ter acesso somente às próprias informações financeiras.

---

## 4. Cadastro de usuário

### O que o usuário verá

Uma tela com os campos necessários para criar uma conta:

- Nome completo.
- E-mail.
- Senha.
- Confirmação de senha.

### O que o usuário poderá fazer

Preencher os campos e criar sua conta.

### O que deverá acontecer

A plataforma deverá:

- Verificar se todos os campos obrigatórios foram preenchidos.
- Conferir se o e-mail possui um formato válido.
- Verificar se o e-mail já está cadastrado.
- Conferir se as senhas informadas são iguais.
- Proteger a senha para que ela não seja armazenada de maneira legível.
- Criar a conta do usuário.

Após o cadastro, o usuário poderá entrar na plataforma.

---

## 5. Página inicial — Resumo financeiro

Esta será a principal tela do FinanceFlow.

### O que o usuário verá

Um painel com as principais informações financeiras:

**Resumo do dinheiro**
- Saldo atual.
- Total de receitas do mês.
- Total de despesas do mês.
- Diferença entre receitas e despesas.

**Gráficos**
- Comparação entre receitas e despesas.
- Despesas separadas por categoria.
- Evolução dos gastos ao longo dos meses.

**Últimas movimentações**
- Descrição da movimentação.
- Valor.
- Categoria.
- Data.
- Indicação de receita ou despesa.

**Metas**
- Metas financeiras em andamento.
- Valor já guardado.
- Quanto falta para alcançar cada objetivo.

### O que o usuário poderá fazer

- Consultar seu saldo.
- Visualizar os resultados do mês.
- Alterar o período que deseja consultar.
- Acessar suas movimentações.
- Cadastrar uma nova receita ou despesa.
- Consultar suas metas.

### O que deverá acontecer

Todas as informações apresentadas deverão ser atualizadas conforme o usuário cadastrar, alterar ou excluir suas movimentações.

Por exemplo:

Se o usuário cadastrar uma receita de R$ 2.000,00, o valor deverá ser considerado no total de receitas e no cálculo do saldo.

Se cadastrar uma despesa de R$ 500,00, o valor deverá ser considerado no total de despesas e descontado do saldo.

Os gráficos também deverão acompanhar essas alterações.

---

## 6. Receitas e despesas

Esta área será responsável por registrar todas as movimentações financeiras do usuário.

### O que o usuário verá

Uma lista com suas movimentações, organizada por data.

Cada registro deverá apresentar:

- Nome ou descrição.
- Valor.
- Tipo de movimentação.
- Categoria.
- Data.
- Data de cadastro, quando necessário.

### O que o usuário poderá fazer

- Cadastrar uma receita.
- Cadastrar uma despesa.
- Editar uma movimentação.
- Excluir uma movimentação.
- Pesquisar pelo nome ou descrição.
- Filtrar por período.
- Filtrar por categoria.
- Visualizar somente receitas.
- Visualizar somente despesas.

### Cadastro de receita ou despesa

O formulário deverá apresentar:

- Descrição da movimentação.
- Valor.
- Categoria.
- Data.
- Tipo: receita ou despesa.

### O que deverá acontecer

Ao cadastrar uma movimentação, a plataforma deverá conferir se os dados estão corretos.

O valor deverá ser maior que zero e todos os campos obrigatórios deverão estar preenchidos.

A categoria escolhida deverá ser compatível com o tipo de movimentação.

Exemplo:

Uma categoria de receita, como Salário, não poderá ser utilizada em uma despesa.

Depois de salvar, a movimentação deverá aparecer na lista e atualizar os valores apresentados no resumo financeiro.

Ao editar uma movimentação, os cálculos deverão considerar o novo valor.

Ao excluir uma movimentação, ela deverá deixar de participar dos cálculos financeiros.

---

## 7. Categorias

As categorias servem para organizar as receitas e despesas.

### O que o usuário verá

Uma área com duas divisões:

**Categorias de receitas**
- Salário.
- Investimentos.
- Vendas.
- Outros recebimentos.

**Categorias de despesas**
- Alimentação.
- Moradia.
- Transporte.
- Saúde.
- Educação.
- Lazer.
- Compras.
- Contas.
- Outros gastos.

Essas categorias serão exemplos iniciais e poderão ser ajustadas.

### O que o usuário poderá fazer

- Visualizar categorias.
- Criar uma categoria personalizada.
- Alterar o nome de uma categoria.
- Excluir categorias que não estejam sendo utilizadas.

### O que deverá acontecer

Cada categoria deverá ser identificada como receita ou despesa.

Quando o usuário criar uma categoria, ela deverá ficar disponível nos formulários correspondentes.

A plataforma não deverá permitir que uma categoria seja excluída e deixe movimentações antigas sem classificação.

Se uma categoria estiver sendo utilizada, o usuário deverá primeiro resolver essas movimentações, por exemplo, escolhendo outra categoria para elas.

---

## 8. Metas financeiras

Esta área permitirá que o usuário planeje objetivos e acompanhe seu progresso.

### O que o usuário verá

Uma lista de metas com:

- Nome do objetivo.
- Valor desejado.
- Valor já guardado.
- Valor restante.
- Data prevista para alcançar o objetivo.
- Barra de progresso.

Exemplos:
- Comprar um computador.
- Fazer uma viagem.
- Montar uma reserva de emergência.
- Comprar um veículo.

### O que o usuário poderá fazer

- Criar uma meta.
- Informar quanto deseja juntar.
- Definir uma data para alcançar o objetivo.
- Registrar novos valores guardados.
- Editar uma meta.
- Excluir uma meta.
- Consultar o progresso.

### O que deverá acontecer

Ao criar uma meta, a plataforma deverá registrar o valor desejado e o valor inicial guardado.

Sempre que o usuário registrar um novo valor guardado, o progresso deverá ser atualizado.

Exemplo:

Meta: Comprar um notebook.

Valor desejado: R$ 5.000,00.

Valor guardado: R$ 2.000,00.

A plataforma deverá apresentar:

- Progresso: 40%.
- Valor restante: R$ 3.000,00.

**Importante:** registrar um valor guardado em uma meta não deverá descontar automaticamente o saldo financeiro. Caso o usuário queira registrar a saída desse dinheiro da conta, deverá cadastrar também a movimentação correspondente. Assim, o mesmo valor não será descontado duas vezes.

---

## 9. Relatórios financeiros

Esta área deverá apresentar uma visão mais detalhada do comportamento financeiro do usuário.

### O que o usuário verá

- Total de receitas em determinado período.
- Total de despesas.
- Resultado financeiro do período.
- Categorias com maiores despesas.
- Comparação entre diferentes meses.
- Histórico das movimentações.

### O que o usuário poderá fazer

- Selecionar um mês.
- Consultar um período personalizado.
- Comparar resultados de meses diferentes.
- Identificar onde está gastando mais.
- Consultar a evolução de suas finanças.

### O que deverá acontecer

A plataforma deverá reunir as movimentações registradas e organizar os resultados conforme o período selecionado.

Os relatórios deverão considerar somente os dados do próprio usuário.

Em uma versão posterior, também será possível exportar os relatórios em PDF ou planilha.

---

## 10. Perfil e configurações

Esta área permitirá que o usuário consulte e altere suas informações pessoais.

### O que o usuário verá

- Nome cadastrado.
- E-mail.
- Opções de alteração de senha.
- Opção para sair da conta.

### O que o usuário poderá fazer

- Alterar seu nome.
- Alterar sua senha.
- Encerrar sua sessão.
- Consultar informações da conta.

### O que deverá acontecer

A plataforma deverá conferir os dados antes de salvar qualquer alteração.

Ao sair da conta, o usuário deverá ser direcionado à tela de acesso.

As informações financeiras já cadastradas deverão continuar salvas para quando ele entrar novamente.

---

## 11. Regras gerais de funcionamento

Estas regras deverão ser respeitadas em todas as áreas da plataforma.

1. Cada usuário poderá visualizar e alterar somente suas próprias informações.
2. Toda receita ou despesa deverá possuir um valor maior que zero.
3. Uma receita deverá aumentar o saldo.
4. Uma despesa deverá diminuir o saldo.
5. O saldo deverá ser calculado a partir das movimentações registradas.
6. As alterações nas movimentações deverão atualizar os totais e gráficos.
7. Nenhuma informação deverá ser perdida ao atualizar ou fechar a página.
8. Os valores financeiros deverão ser apresentados no formato brasileiro, como R$ 1.250,50.
9. A plataforma deverá informar claramente quando uma ação não puder ser concluída.
10. A plataforma deverá funcionar em computadores, tablets e celulares.

---

## 12. Mensagens e situações que a plataforma deverá tratar

O FinanceFlow deverá orientar o usuário sempre que alguma situação acontecer.

Exemplos:

| Situação | Mensagem esperada |
|---|---|
| Cadastro realizado | Conta criada com sucesso! |
| Login incorreto | E-mail ou senha inválidos. |
| Campo obrigatório vazio | Preencha todos os campos obrigatórios. |
| Valor igual a zero | Informe um valor maior que zero. |
| Movimentação cadastrada | Movimentação salva com sucesso! |
| Movimentação excluída | Movimentação excluída com sucesso! |
| Categoria em utilização | Esta categoria possui movimentações vinculadas. |
| Lista sem registros | Nenhuma movimentação encontrada. |
| Falha ao salvar | Não foi possível salvar. Tente novamente. |

As mensagens deverão ser simples, diretas e fáceis de compreender.

---

## 13. O que cada parte da plataforma será responsável por fazer

O FinanceFlow terá duas partes principais que trabalharão juntas.

### Parte visual — O que o usuário utiliza

É a parte que aparece na tela.

Ela será responsável por:

- Apresentar as páginas e os menus.
- Mostrar os dados financeiros.
- Exibir gráficos e tabelas.
- Apresentar formulários de cadastro e edição.
- Permitir que o usuário navegue pela plataforma.
- Mostrar mensagens de sucesso e erro.
- Adaptar a apresentação para celulares e computadores.
- Enviar as informações preenchidas pelo usuário para serem processadas.

### Parte de funcionamento — O que acontece nos bastidores

É a parte responsável por organizar, conferir e guardar as informações.

Ela será responsável por:

- Criar e proteger as contas dos usuários.
- Conferir os dados recebidos.
- Registrar receitas e despesas.
- Atualizar as informações financeiras.
- Calcular o saldo.
- Organizar categorias.
- Controlar as metas financeiras.
- Preparar os relatórios.
- Guardar os dados no banco de informações.
- Garantir que cada usuário tenha acesso somente aos próprios registros.

### Como as duas partes trabalham juntas

Exemplo: o usuário cadastra uma despesa de R$ 150,00 na categoria Alimentação.

1. O usuário abre a tela de movimentações.
2. Preenche a descrição, o valor, a categoria e a data.
3. A parte visual envia essas informações para o sistema.
4. O sistema confere se os dados estão corretos.
5. Se estiverem corretos, registra a despesa.
6. A parte visual recebe a confirmação.
7. A lista de movimentações é atualizada.
8. O resumo financeiro apresenta o novo total de despesas e o saldo atualizado.

O usuário não precisa conhecer esse processo. Para ele, basta preencher o formulário e visualizar o resultado.

---

## 14. Etapas de desenvolvimento

Para construir o FinanceFlow de maneira organizada, o desenvolvimento será dividido em etapas.

### Etapa 1 — Estrutura inicial
- Criar a identidade visual.
- Preparar as telas principais.
- Organizar a navegação.
- Preparar o ambiente de funcionamento.

### Etapa 2 — Cadastro e acesso
- Criar contas.
- Entrar e sair da plataforma.
- Recuperar senha.
- Proteger as informações de cada usuário.

### Etapa 3 — Categorias
- Apresentar categorias iniciais.
- Criar categorias personalizadas.
- Editar e excluir categorias.

### Etapa 4 — Receitas e despesas
- Cadastrar movimentações.
- Listar movimentações.
- Editar e excluir registros.
- Criar pesquisas e filtros.

### Etapa 5 — Resumo financeiro
- Calcular saldo.
- Apresentar receitas e despesas.
- Criar gráficos.
- Exibir movimentações recentes.

### Etapa 6 — Metas financeiras
- Criar metas.
- Registrar valores guardados.
- Calcular progresso.
- Acompanhar objetivos.

### Etapa 7 — Relatórios
- Criar consultas por período.
- Comparar meses.
- Apresentar categorias de maiores gastos.
- Preparar exportações.

### Etapa 8 — Finalização
- Testar todas as funcionalidades.
- Corrigir problemas.
- Melhorar a apresentação em celulares.
- Preparar a publicação da plataforma.
- Criar instruções de utilização.

---

## 15. Resultado esperado

Ao final do desenvolvimento, o FinanceFlow deverá ser uma plataforma em que qualquer usuário consiga:

- Criar uma conta pessoal.
- Registrar suas receitas e despesas.
- Organizar seus gastos por categorias.
- Consultar seu saldo atualizado.
- Visualizar gráficos de sua vida financeira.
- Criar metas e acompanhar seus objetivos.
- Consultar relatórios de diferentes períodos.
- Acessar suas informações com segurança.

**O principal objetivo do FinanceFlow é transformar registros financeiros em informações fáceis de entender, ajudando o usuário a ter mais controle sobre o próprio dinheiro.**
