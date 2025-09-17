import os
import json
import boto3
import logging

# Configuração do logger para que os logs apareçam no CloudWatch
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Inicializa o client do S3 usando o Boto3 (SDK da AWS para Python)
s3 = boto3.client('s3')

# Variável de ambiente do S3
S3_BUCKET = os.environ['S3_BUCKET']

# Função principal da Lambda
def lambda_handler(event, _context):
    """
    Esta função é acionada por uma Step Function logo após o pedido ser criado.
    Ela salva o token da tarefa e os detalhes do pedido em um arquivo JSON no S3,
    aguardando a confirmação de pagamento.
    """

    # Loga o evento recebido para visualização no CloudWatch
    logger.info(f"Evento Recebido: {event}")

    try:

        # Extrai os dados recebidos pelo evento (vindo da Step Function)
        task_token = event['taskToken']
        pedido_id = event['pedidoId']
        produtos = event['produtos']
        total = event['total']

        # Loga os detalhes do pedido recebido para rastreamento e depuração
        logger.info(f"[Processando Pedido] ID: {pedido_id}, Total: {total}, Produtos: {produtos}")

        # Gera o caminho do arquivo no S3
        s3_key = f"tokens/pedido-{pedido_id}.json"

        # Salva os dados no S3, com um nome de arquivo baseado no ID do pedido
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps({
                "taskToken": task_token,
                "produtos": produtos,
                "total": total
            }),
            ContentType="application/json"
        )

        # Loga a confirmação que o arquivo foi salvo com sucesso no S3
        logger.info(f"[S3 Upload] Arquivo salvo com sucesso: s3://{S3_BUCKET}/{s3_key}")

        # Retorna uma resposta simples indicando que o pedido está aguardando pagamento
        return { "status": "Aguardando pagamento" }

    except Exception as e:
        # Em caso de erro, loga com stack trace para análise posterior
        logger.error(f"Falha ao salvar pedido {pedido_id}: {str(e)}", exc_info=True)
        raise
    